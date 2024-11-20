/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Package } from '../package/package.model';
import { Service } from '../service/service.model';
import { IOrder, IOrderFilter } from './order.interface';
import { Order } from './order.model';
import { generateCustomOrderId } from './order.utils';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { User } from '../user/user.model';
import { Types } from 'mongoose';

const createOrder = async (payload: IOrder) => {
  // Generate a unique order id
  const orderId = await generateCustomOrderId();
  payload.orderId = orderId;

  // Ensure all initial checks are done concurrently
  const [
    vendorExist,
    customerExist,
    serviceExist,
    packageExist,
    existingOrder,
  ] = await Promise.all([
    User.findOne({ vendor: payload.vendorId }, { status: 'active' }),
    User.findOne(
      { customer: payload.customerId },
      { status: 'active' }
    ).populate('customer', { name: 1 }),
    Service.findById(payload.serviceId),
    Package.findById(payload.packageId),
    Order.findOne({
      vendorId: payload.vendorId,
      serviceStartDateTime: { $lt: payload.serviceEndDateTime },
      serviceEndDateTime: { $gt: payload.serviceStartDateTime },
      status: { $in: ['accepted', 'ongoing'] }, // Match 'accepted' or 'ongoing' status
    }),
  ]);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor does not exist');
  }
  if (!serviceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service does not exist');
  }
  if (!packageExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Package does not exist');
  }
  if (existingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The vendor is already busy during this time slot.'
    );
  }

  const date = payload.serviceStartDateTime.toString().split('T')[0];

  // Aggregate vendor orders for the given date in parallel
  const vendorOrders = await Order.aggregate([
    {
      $project: {
        orderId: 1,
        status: 1,
        serviceStartDateTime: 1,
        // Extract only the date part (YYYY-MM-DD)
        serviceStartDate: {
          $dateToString: { format: '%Y-%m-%d', date: '$serviceStartDateTime' },
        },
      },
    },
    {
      $match: {
        serviceStartDate: date, // Desired date to filter
        status: 'accepted',
      },
    },
  ]);

  if (vendorOrders.length >= 10) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Vendor already has 10 active orders for the day'
    );
  }

  // Create the new order
  const result = await Order.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create order');
  }

  const notificationData = {
    userId: vendorExist?._id,
    title: `Order request from ${customerExist?.customer?.name}`,
    message: 'You have a new order request. Please check your order dashboard.',
    type: USER_ROLES.VENDOR,
  };

  await sendNotification(
    'newOrder',
    payload.vendorId as Types.ObjectId,
    notificationData
  );

  return result;
};

const getAllOrders = async () => {
  const result = await Order.find({});
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }
  return result;
};

const getAllOrderByUserId = async (
  user: JwtPayload,
  filters: Partial<IOrderFilter>
) => {
  const { serviceDate, ...filterData } = filters;

  const andCondition = [];

  if (Object.keys(filterData).length > 0) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => {
        return {
          [field]: value,
        };
      }),
    });
  }

  if (serviceDate) {
    // Add date range filter based on serviceDate
    if (serviceDate) {
      const startOfDay = new Date(`${serviceDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${serviceDate}T23:59:59.999Z`);

      andCondition.push({
        $or: [
          {
            serviceStartDateTime: { $gte: startOfDay, $lt: endOfDay },
          },
          {
            serviceEndDateTime: { $gte: startOfDay, $lt: endOfDay },
          },
        ],
      });
    }
  }

  const { role } = user;

  role === USER_ROLES.CUSTOMER
    ? andCondition.push({ customerId: user.userId })
    : andCondition.push({ vendorId: user.userId });

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Order.find(whereConditions)
    .populate('vendorId', { name: 1, email: 1, phone: 1, address: 1 })
    .populate('packageId')
    .populate('serviceId', { title: 1, price: 1 })
    .populate('paymentId')
    .populate('customerId', { name: 1, email: 1, phone: 1, address: 1 })
    .lean();

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }
  return result;
};

const getSingleOrder = async (id: string) => {
  const result = await Order.findById(id)
    .populate('vendorId', { name: 1, email: 1, phone: 1, address: 1 })
    .populate('packageId', { title: 1 })
    .populate('serviceId', { title: 1, price: 1 })
    .populate('paymentId')
    .populate('customerId', { name: 1, email: 1, phone: 1, address: 1 })
    .lean();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order does not exist');
  }
  return result;
};

const declineOrConfirmOrder = async (id: string, payload: Partial<IOrder>) => {
  if (payload?.status === 'decline') {
    if (!payload.deliveryDeclineMessage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Delivery Decline Message is required'
      );
    }
  }

  const result = await Order.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }
  return result;
};

const rejectOrAcceptOrder = async (id: string, payload: Partial<IOrder>) => {
  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  if (payload.status === 'accepted') {
    const conflictingOrder = await Order.findOne({
      vendorId: order.vendorId,
      serviceStartDateTime: { $lt: order.serviceEndDateTime },
      serviceEndDateTime: { $gt: order.serviceStartDateTime },
      status: { $in: ['accepted', 'ongoing'] },
      _id: { $ne: id }, // Exclude the current order
    });

    // console.log(conflictingOrder);

    if (conflictingOrder) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'The vendor already has an order during this time slot'
      );
    }
  }

  // Update the order status
  const result = await Order.findByIdAndUpdate(
    id,
    { status: payload.status },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  return result;
};

export const OrderService = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getAllOrderByUserId,
  declineOrConfirmOrder,
  rejectOrAcceptOrder,
};
