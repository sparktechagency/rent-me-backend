import { getDuration, validateOrderTime } from './order.utils';
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

import {
  IEnrichedOrder,
  IOrder,
  IOrderFilterableFields,
} from './order.interface';
import { Order } from './order.model';
import { calculateDistance, generateCustomOrderId } from './order.utils';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import {
  sendDataWithSocket,
  sendNotification,
} from '../../../helpers/sendNotificationHelper';
import { User } from '../user/user.model';
import { Types } from 'mongoose';

import { IVendor } from '../vendor/vendor.interface';
import { ICustomer } from '../customer/customer.interface';
import config from '../../../config';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../types/pagination';
import { orderSearchableFields } from './order.constant';
import { Vendor } from '../vendor/vendor.model';
import { Package } from '../package/package.model';

const createOrder = async (payload: IOrder) => {
  // Generate a custom order ID
  const orderId = await generateCustomOrderId();
  payload.orderId = orderId;

  let setupStartDateAndTime: Date | undefined;

  // Handle setup duration and compute start time
  if (payload.isSetup) {
    const setupDurationMs = getDuration(payload.setupDuration);
    const deliveryDate = new Date(payload.deliveryDateAndTime);

    if (isNaN(setupDurationMs) || isNaN(deliveryDate.getTime())) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid setup duration or delivery date.'
      );
    }

    setupStartDateAndTime = new Date(deliveryDate.getTime() - setupDurationMs);
  }

  const deliveryDateAndTime = new Date(payload.deliveryDateAndTime);
  const currentDate = new Date();

  // Prevent orders in the past
  if (deliveryDateAndTime < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot create an order for a past time.'
    );
  }

  // Fetch vendor, customer, and package details
  const [vendorExist, customerExist, packageExist] = await Promise.all([
    User.findOne({ vendor: payload.vendorId, status: 'active' }).populate(
      'vendor',
      {
        name: 1,
        availableDays: 1,
        operationStartTime: 1,
        operationEndTime: 1,
        location: 1,
      }
    ),
    User.findOne({ customer: payload.customerId, status: 'active' }).populate(
      'customer',
      {
        name: 1,
        location: 1,
      }
    ),
    Package.findById(payload.packageId, { setupFee: 1, setupDuration: 1 }),
  ]);

  if (!vendorExist)
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor does not exist.');
  if (!customerExist)
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'You are not allowed to create an order.'
    );
  if (!packageExist)
    throw new ApiError(StatusCodes.NOT_FOUND, 'Package does not exist.');

  const { availableDays, operationStartTime, operationEndTime, location } =
    vendorExist.vendor as IVendor;

  // Check for conflicting orders
  const query = payload.isSetup
    ? [
        {
          setupStartDateAndTime: { $lt: deliveryDateAndTime },
          deliveryDateAndTime: { $gt: setupStartDateAndTime },
        },
      ]
    : [
        {
          setupStartDateAndTime: { $lt: deliveryDateAndTime },
          deliveryDateAndTime: { $gt: deliveryDateAndTime },
        },
      ];

  const existingOrder = await Order.findOne({
    vendorId: payload.vendorId,
    status: { $in: ['accepted', 'ongoing', 'started'] },
    $and: query,
  });

  if (existingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The vendor is already busy during this time slot.'
    );
  }

  // Check for customer's conflicting orders
  const customerExistingOrder = await Order.findOne({
    customerId: payload.customerId,
    vendorId: payload.vendorId,
    status: { $in: ['pending', 'accepted', 'ongoing', 'started'] },
    $and: query,
  });

  if (customerExistingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have already placed an order with this vendor during this time slot.'
    );
  }

  // Validate operation time
  if (!payload.isSetup) {
    validateOrderTime(
      deliveryDateAndTime,
      operationStartTime!,
      operationEndTime!
    );
  }

  // Check vendor's available days
  const requestedDay = deliveryDateAndTime.toLocaleDateString('en-US', {
    weekday: 'long',
  });
  if (!availableDays!.includes(requestedDay)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Vendor is not available on the requested day.'
    );
  }

  // Calculate fees if setup is included
  if (payload.isSetup) {
    const distance = calculateDistance(
      [location.coordinates[0], location.coordinates[1]],
      [
        payload.deliveryLocation.coordinates[0],
        payload.deliveryLocation.coordinates[1],
      ]
    );

    const fee = (distance * Number(config.delivery_fee)).toFixed(2);
    payload.deliveryFee = Number(fee);
    payload.setupFee = packageExist.setupFee;
    payload.setupStartDateAndTime = setupStartDateAndTime!;
  }

  const orderData = {
    ...payload,
  };

  // Create the order in the database
  const result = await Order.create(orderData);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create order.');
  }

  // Send notification to the vendor
  const { name } = customerExist.customer as ICustomer;
  const notificationData = {
    userId: vendorExist._id,
    title: `Order request from ${name}`,
    message: `${name} has placed an order. Please accept or decline the order. Order ID: ${orderId}`,
    type: USER_ROLES.VENDOR,
  };

  await sendNotification(
    'newOrder',
    payload.vendorId as Types.ObjectId,
    notificationData,
    'order'
  );

  //send new order details to the vendor through socket

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
    .populate('customerId', {
      name: 1,
      email: 1,
      profileImg: 1,
      phone: 1,
      address: 1,
    })
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
    .populate('vendorId', {
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
      profileImg: 1,
      orderCompleted: 1,
      rating: 1,
      totalReviews: 1,
      verifiedFlag: 1,
      businessContact: 1,
    })
    .populate('packageId', { title: 1 })
    .populate('serviceId', { title: 1, price: 1 })
    .populate('paymentId')
    .populate('customerId', {
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
      profileImg: 1,
    })
    .populate('review', { rating: 1, comment: 1 })
    .skip(skip)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .lean();

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }

  const total = await Order.countDocuments(whereConditions);

  const applicationChargeRate = Number(config.application_fee);
  const ccChargeRate = Number(config.customer_cc_rate);

  const enrichedOrders = result.map(order => {
    const enrichedOrder: IEnrichedOrder & IOrder = {
      ...order,
    };

    if (user.role === USER_ROLES.CUSTOMER) {
      enrichedOrder.customerCCCharge = order.amount * ccChargeRate;
    }
    if (user.role === USER_ROLES.VENDOR) {
      const applicationCharge = Math.floor(
        order.amount * applicationChargeRate
      );
      enrichedOrder.vendorReceivable = Math.floor(
        order.amount - (applicationCharge + order.amount * ccChargeRate)
      );
      enrichedOrder.applicationChargeRate = applicationChargeRate;
      enrichedOrder.instantTransferChargeRate = Number(
        config.instant_transfer_fee
      );
    }

    return enrichedOrder;
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: enrichedOrders,
  };
};

const getSingleOrder = async (id: string) => {
  const result = await Order.findById(id)
    .populate('vendorId', {
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
      profileImg: 1,
      orderCompleted: 1,
      rating: 1,
      totalReviews: 1,
      verifiedFlag: 1,
      businessContact: 1,
    })
    .populate('packageId', { title: 1 })
    .populate('serviceId', { title: 1, price: 1 })
    .populate('paymentId')
    .populate('customerId', {
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
      profileImg: 1,
    })
    .populate('review', { rating: 1, comment: 1 })
    .lean();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order does not exist');
  }
  return result;
};

const declineOrder = async (
  id: string,
  payload: Pick<IOrder, 'status' | 'deliveryDeclineMessage'>
) => {
  if (payload?.status === 'declined' && !payload?.deliveryDeclineMessage) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Delivery Decline Message is required'
    );
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
      { status: 1 }
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

  if (customerExist._id.toString() !== orderExists.customerId.toString()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not allowed to update status of  this order'
    );
  }

  //update the order status
  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'accepted' },
    { $set: { ...payload } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  const { name } = customerExist?.customer as ICustomer;

  const notificationData = {
    userId: vendorExist._id,
    title: `${name} has ${payload?.status} the order. Order ID: ${result?.orderId}`,
    message: `${payload?.deliveryDeclineMessage}`,
    type: USER_ROLES.VENDOR,
  };

  await sendNotification(
    payload?.status === 'declined' ? 'declinedOrder' : 'confirmedOrder',
    result.vendorId as Types.ObjectId,
    notificationData,
    'order'
  );

  await sendDataWithSocket('order', orderExists.vendorId as Types.ObjectId, {
    ...result,
  });

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
      { status: 1 }
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

  const { stripeId, stripeConnected, verifiedFlag, name } =
    vendorExist.vendor as IVendor;

  if (
    !stripeId ||
    stripeId === '' ||
    stripeId === null ||
    stripeId === undefined ||
    !stripeConnected
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please add your payment method first'
    );
  }

  if (verifiedFlag === false) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You account information is not verified, please verify your account first'
    );
  }

  if (payload.status === 'accepted') {
    let conflictingOrder;

    if (orderExists.isSetup) {
      conflictingOrder = await Order.findOne({
        vendorId: orderExists.vendorId,
        setupStartDateAndTime: { $lt: orderExists.deliveryDateAndTime },
        deliveryDateAndTime: { $gt: orderExists.setupStartDateAndTime },
        status: { $in: ['accepted', 'ongoing', 'started'] },
        _id: { $ne: id },
      });
    } else {
      conflictingOrder = await Order.findOne({
        vendorId: orderExists.vendorId,
        deliveryDateAndTime: orderExists.deliveryDateAndTime,
        status: { $in: ['accepted', 'ongoing', 'started'] },
        _id: { $ne: id },
      });
    }

    if (conflictingOrder) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'The vendor already has an order during this time slot'
      );
    }

    if (orderExists.isSetup) {
      if (!payload.setupDuration) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Setup duration is required for setup orders'
        );
      }

      const setupDurationMs = getDuration(payload.setupDuration);
      const deliveryDate = new Date(orderExists.deliveryDateAndTime);
      const setupStartDateAndTime = new Date(
        deliveryDate.getTime() - setupDurationMs
      );

      if (isNaN(setupStartDateAndTime.getTime())) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid setup start date calculation'
        );
      }

      payload.setupStartDateAndTime = setupStartDateAndTime;
      payload.setupFee = payload.setupFee || orderExists.setupFee;
    }
  }

  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { ...payload } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  const notificationData = {
    userId: customerExist._id,
    title: `Order ${payload?.status} by ${name}`,
    message: `Order request for ID:${orderExists?.orderId} is ${payload?.status} by ${name}.`,
    type: USER_ROLES.CUSTOMER,
  };

  await sendNotification(
    payload?.status === 'rejected' ? 'rejectedOrder' : 'acceptedOrder',
    result.customerId as Types.ObjectId,
    notificationData
  );

  return result;
};

const getDeliveryCharge = async (
  payload: { coordinates: number[] },
  vendorId: string
) => {
  const { coordinates } = payload;
  const vendor = await Vendor.findById(vendorId, { location: 1 });

  if (!vendor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor not found');
  }

  const location = vendor?.location;

  const distance = calculateDistance(
    [coordinates[0], coordinates[1]],
    [location.coordinates[0], location.coordinates[1]]
  );
  const fee = (distance * Number(config.delivery_fee)).toFixed(2);
  return fee;
};

export const OrderService = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getAllOrderByUserId,
  declineOrder,
  rejectOrAcceptOrder,
  getDeliveryCharge,
};
