import { validateOrderTime } from './order.utils';
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

import { IOrder, IOrderFilterableFields } from './order.interface';
import { Order } from './order.model';
import {
  calculateDistance,
  generateCustomOrderId,
  parseDuration,
} from './order.utils';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { User } from '../user/user.model';
import { Types } from 'mongoose';

import { IVendor } from '../vendor/vendor.interface';
import { ICustomer } from '../customer/customer.interface';
import config from '../../../config';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../types/pagination';
import { orderSearchableFields } from './order.constant';

const createOrder = async (payload: IOrder) => {
  const orderId = await generateCustomOrderId();
  payload.orderId = orderId;

  let payloadSetupStartDateAndTime;
  if (payload.isSetup) {
    const setupDurationMs = payload.isSetup
      ? parseDuration(payload.setupDuration)
      : 0;

    const deliveryDate = new Date(payload.deliveryDateAndTime);
    payloadSetupStartDateAndTime = new Date(
      deliveryDate.getTime() - setupDurationMs
    );
  }

  const payloadDeliveryDateAndTime = new Date(payload.deliveryDateAndTime);

  const currentDate = new Date();

  //past order prevent
  if (payloadDeliveryDateAndTime < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create an order for a past time'
    );
  }

  const [vendorExist, customerExist] = await Promise.all([
    User.findOne({ vendor: payload.vendorId, status: 'active' }).populate(
      'vendor',
      {
        availableDays: 1,
        operationStartTime: 1,
        operationEndTime: 1,
        location: 1,
      }
    ),
    User.findOne({ customer: payload.customerId, status: 'active' }).populate(
      'customer',
      { name: 1, location: 1 }
    ),
  ]);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor does not exist');
  }

  if (!customerExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'You are not allowed to create order'
    );
  }

  const { availableDays, operationStartTime, operationEndTime, location } =
    vendorExist.vendor! as IVendor;

  const { name } = customerExist!.customer! as ICustomer;

  const query = [];

  if (payload.isSetup) {
    query.push({
      setupStartDateAndTime: { $lt: payloadDeliveryDateAndTime },
      deliveryDateAndTime: { $gt: payloadSetupStartDateAndTime },
    });
  } else {
    query.push({
      setupStartDateAndTime: { $lt: payloadDeliveryDateAndTime },
      deliveryDateAndTime: { $gt: payloadDeliveryDateAndTime },
    });
  }

  const existingOrder = await Order.findOne({
    vendorId: payload.vendorId,
    status: { $in: ['accepted', 'ongoing', 'confirmed', 'on the way'] },
    $and: query.length > 0 ? query : [{}],
  });

  if (existingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The vendor is already busy during this time slot.'
    );
  }

  // Check if customer already has an order for this vendor during the requested time slot
  const customerExistingOrder = await Order.findOne({
    customerId: payload.customerId,
    vendorId: payload.vendorId,
    status: {
      $in: ['pending', 'accepted', 'ongoing', 'confirmed', 'on the way'],
    },
    $and: query.length > 0 ? query : [{}],
  });

  if (customerExistingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already placed an order with this vendor during this time slot.'
    );
  }

  !payload.isSetup &&
    validateOrderTime(
      payloadDeliveryDateAndTime,
      operationStartTime!,
      operationEndTime!
    );

  const requestedDate = new Date(payload.deliveryDateAndTime);
  const requestedDay = requestedDate.toLocaleDateString('en-US', {
    weekday: 'long',
  });
  if (!availableDays!.includes(requestedDay)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Vendor is not available on the requested day'
    );
  }

  if (payload.isSetup) {
    //calculate distance
    const distance = calculateDistance(
      [location.coordinates[0], location.coordinates[1]],
      [
        payload.deliveryLocation.coordinates[0],
        payload.deliveryLocation.coordinates[1],
      ]
    );
    const fee = (distance * Number(config.delivery_fee)).toFixed(2);
    payload.deliveryFee = Number(fee);
  }

  const orderData = {
    ...payload,
    setupStartDateAndTime: payloadDeliveryDateAndTime,
  };

  const result = await Order.create(orderData);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create order');
  }

  const notificationData = {
    userId: vendorExist?._id,
    title: `Order request from ${name}`,
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

const getAllOrders = async (
  filters: IOrderFilterableFields,
  paginationOptions: IPaginationOptions
) => {
  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);

  const { searchTerm, ...filtersData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: orderSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  const result = await Order.find(whereConditions)
    .populate('vendorId', { name: 1, email: 1, profileImg: 1, phone: 1 })
    .populate('customerId', { name: 1, email: 1, profileImg: 1, phone: 1 })
    .skip(skip)
    .sort({ [sortBy]: sortOrder })
    .limit(limit);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }

  const total = await Order.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getAllOrderByUserId = async (
  user: JwtPayload,
  filters: Partial<IOrderFilterableFields>,
  paginationOptions: IPaginationOptions
) => {
  const { serviceDate, ...filterData } = filters;
  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);

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
            setupStartDateAndTime: { $gte: startOfDay, $lt: endOfDay },
          },
          {
            deliveryDateAndTime: { $gte: startOfDay, $lt: endOfDay },
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
    .skip(skip)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .lean();

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }

  const total = await Order.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
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

  const { name } = customerExist?.customer as { name: string };

  const notificationData = {
    userId: vendorExist._id,
    title: `Order ${payload?.status} by ${name}`,
    message: `${name} has ${payload?.status} the order.`,
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

  const { name } = vendorExist.vendor as { name: string };

  const notificationData = {
    userId: customerExist._id,
    title: `Order ${payload?.status} by ${name}`,
    message: `Order request for ID:${orderExists?.orderId} is ${payload?.status} by ${name}.`,
    type: USER_ROLES.CUSTOMER,
  };

  if (payload.status === 'accepted') {
    let conflictingOrder;

    if (orderExists.isSetup) {
      conflictingOrder = await Order.findOne({
        vendorId: orderExists.vendorId,
        setupStartDateAndTime: { $lt: orderExists.deliveryDateAndTime },
        deliveryDateAndTime: { $gt: orderExists.setupStartDateAndTime },
        status: { $in: ['accepted', 'ongoing', 'on the way'] },
        _id: { $ne: id },
      });
    } else {
      conflictingOrder = await Order.findOne({
        vendorId: orderExists.vendorId,
        deliveryDateAndTime: orderExists.deliveryDateAndTime,
        status: { $in: ['accepted', 'ongoing', 'on the way'] },
        _id: { $ne: id },
      });
    }

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
