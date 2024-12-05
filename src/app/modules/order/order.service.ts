/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Package } from '../package/package.model';
import { Service } from '../service/service.model';
import { IOrder, IOrderFilter } from './order.interface';
import { Order } from './order.model';
import { generateCustomOrderId, validateOrderTime } from './order.utils';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { User } from '../user/user.model';
import { Types } from 'mongoose';
import { Vendor } from '../vendor/vendor.model';

const createOrder = async (payload: IOrder) => {
  const orderId = await generateCustomOrderId();
  payload.orderId = orderId;

  // Check if the customer already has an active order at the same time
  const existingCustomerOrder = await Order.findOne({
    customerId: payload.customerId,
    vendorId: payload.vendorId,
    serviceStartDateTime: { $lt: payload.serviceEndDateTime },
    serviceEndDateTime: { $gt: payload.serviceStartDateTime },
    status: { $nin: ['rejected', 'declined'] }, // Exclude rejected and declined orders
  });

  if (existingCustomerOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an order request for the same time and date.'
    );
  }

  const [vendorExist, customerExist, vendor, serviceExist, existingOrder] =
    await Promise.all([
      User.findOne(
        { vendor: payload.vendorId, status: 'active' },
        { status: 1, needInformation: 1, approvedByAdmin: 1 }
      ),
      User.findOne({ customer: payload.customerId, status: 'active' }).populate(
        'customer',
        { name: 1 }
      ),
      Vendor.findOne(
        { _id: payload.vendorId },
        { availableDays: 1, operationStartTime: 1, operationEndTime: 1 }
      ),
      Service.findById(payload.serviceId),
      Order.findOne({
        vendorId: payload.vendorId,
        serviceStartDateTime: { $lt: payload.serviceEndDateTime },
        serviceEndDateTime: { $gt: payload.serviceStartDateTime },
        status: { $in: ['accepted', 'ongoing'] },
      }),
    ]);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor does not exist');
  }

  if (vendorExist.needInformation) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Vendor information is incomplete'
    );
  }

  const requestedDate = new Date(payload.serviceStartDateTime);

  //check whether  customer is trying to order for past time
  const currentDate = new Date();

  if (new Date(payload.serviceStartDateTime) < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create an order for a past time'
    );
  }

  const requestedDay = requestedDate.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  if (!vendor!.availableDays!.includes(requestedDay)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Vendor is not available on the requested day'
    );
  }

  if (!vendorExist.approvedByAdmin) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Vendor is not approved by admin'
    );
  }

  if (!serviceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service does not exist');
  }
  if (!serviceExist?.packages?.includes(payload.packageId as Types.ObjectId)) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Package does not exist');
  }
  if (existingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The vendor is already busy during this time slot.'
    );
  }

  const date = payload.serviceStartDateTime.toString().split('T')[0];

  validateOrderTime(
    new Date(payload.serviceStartDateTime),
    new Date(payload.serviceEndDateTime),
    vendor!.operationStartTime!,
    vendor!.operationEndTime!
  );

  const vendorOrders = await Order.aggregate([
    {
      $project: {
        orderId: 1,
        status: 1,
        serviceStartDateTime: 1,
        serviceStartDate: {
          $dateToString: { format: '%Y-%m-%d', date: '$serviceStartDateTime' },
        },
      },
    },
    {
      $match: {
        serviceStartDate: date,
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
    .populate('packageId', { title: 1 })
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

const declineOrConfirmOrder = async (
  id: string,
  payload: Pick<IOrder, 'status' | 'deliveryDeclineMessage'>
) => {
  if (payload?.status === 'declined') {
    if (!payload.deliveryDeclineMessage) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Delivery Decline Message is required'
      );
    }
  }

  const orderExists = await Order.findById({
    _id: id,
    status: 'accepted',
  })
    .populate('vendorId', { name: 1 })
    .populate('customerId', { name: 1 });
  if (!orderExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  const [vendorExist, customerExist] = await Promise.all([
    User.findOne(
      { vendor: orderExists?.vendorId, status: 'active' },
      { status: 1, needInformation: 1, approvedByAdmin: 1 }
    ).populate('vendor', { name: 1 }),
    User.findOne({
      customer: orderExists?.customerId,
      status: 'active',
    }).populate('customer', { name: 1 }),
  ]);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor not found');
  }
  if (!customerExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Customer not found');
  }

  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'accepted' },
    payload,
    { new: true }
  );
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  const notificationData = {
    userId: vendorExist._id,
    title: `Order ${payload?.status} by ${customerExist?.customer?.name}`,
    message: `${customerExist?.customer?.name} has ${payload?.status} the order.`,
    type: USER_ROLES.VENDOR,
  };

  await sendNotification(
    payload?.status === 'declined' ? 'declinedOrder' : 'confirmedOrder',
    result.vendorId as Types.ObjectId,
    notificationData
  );

  return result;
};

const rejectOrAcceptOrder = async (id: string, payload: Partial<IOrder>) => {
  if (payload.status === 'accepted' && !payload.amount) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount is required');
  }

  const orderExists = await Order.findById({ _id: id, status: 'pending' })
    .populate('vendorId', { name: 1 })
    .populate('customerId', { name: 1 });
  if (!orderExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  const [vendorExist, customerExist] = await Promise.all([
    User.findOne(
      { vendor: orderExists?.vendorId, status: 'active' },
      { status: 1, needInformation: 1, approvedByAdmin: 1 }
    ).populate('vendor', { name: 1 }),
    User.findOne({
      customer: orderExists?.customerId,
      status: 'active',
    }).populate('customer', { name: 1 }),
  ]);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor not found');
  }
  if (!customerExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Customer not found');
  }

  const notificationData = {
    userId: customerExist._id,
    title: `Order ${payload?.status} by ${vendorExist?.vendor?.name}`,
    message: `Order request for ID:${orderExists?.orderId} is ${payload?.status} by ${vendorExist?.vendor?.name}.`,
    type: USER_ROLES.CUSTOMER,
  };

  if (payload.status === 'accepted') {
    const conflictingOrder = await Order.findOne({
      vendorId: orderExists.vendorId,
      serviceStartDateTime: { $lt: orderExists.serviceEndDateTime },
      serviceEndDateTime: { $gt: orderExists.serviceStartDateTime },
      status: { $in: ['accepted', 'ongoing'] },
      _id: { $ne: id },
    });

    if (conflictingOrder) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'The vendor already has an order during this time slot'
      );
    }
  }

  let updatedValue;

  payload.status === 'accepted'
    ? (updatedValue = { ...payload, amount: payload.amount })
    : (updatedValue = { ...payload });

  // Update the order status
  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { ...updatedValue },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  await sendNotification(
    payload?.status === 'rejected' ? 'rejectedOrder' : 'acceptedOrder',
    result.customerId as Types.ObjectId,
    notificationData
  );

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
