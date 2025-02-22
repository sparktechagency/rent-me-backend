import {
  calculateDistance,
  calculateOrderCharges,
  generateCustomOrderId,
  getDuration,
  orderNotificationAndDataSendWithSocket,
  validateOrderTime
} from './order.utils';

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

import { IOrder, IOrderFilterableFields } from './order.interface';
import { Order } from './order.model';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';

import { User } from '../user/user.model';


import { IVendor } from '../vendor/vendor.interface';
import { ICustomer } from '../customer/customer.interface';
import config from '../../../config';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../types/pagination';
import { orderSearchableFields } from './order.constant';
import { Vendor } from '../vendor/vendor.model';
import { Package } from '../package/package.model';
import { Cart } from '../cart/cart.model';
import { find } from 'geo-tz';
import { DateTime } from 'luxon';


const createOrder = async (payload: IOrder) => {
  const orderId = await generateCustomOrderId();
  payload.orderId = orderId;

  const {
    deliveryDateAndTime,
    vendorId,
    customerId,
    isSetup,
    setupDuration,
    isCustomOrder,
  } = payload;

    // Fetch vendor, customer, and package details
    const [vendorExist, customerExist, packageExist] = await Promise.all([
      User.findOne({ vendor: vendorId, status: 'active' }).populate<{vendor: IVendor}>({
        path: 'vendor',
        select: {
          name: 1,
          operationStartTime: 1,
          operationEndTime: 1,
          availableDays: 1,
          location: 1,
          deviceId: 1
        }
      }),
      User.findOne({ customer: customerId, status: 'active' }).populate<{customer: {name: string}}>(
        'customer',
        { name: 1 }
      ),
      !isCustomOrder 
        ? Package.findById(payload.packageId, { setupFee: 1, setupDuration: 1 })
        : Promise.resolve(null),
    ]);
  
    // Validate existence
    if (!vendorExist) throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
    if (!customerExist) throw new ApiError(StatusCodes.BAD_REQUEST, 'Customer does not exist');
    if (!packageExist && !isCustomOrder) throw new ApiError(StatusCodes.BAD_REQUEST, 'Package does not exist');


  // Convert deliveryDateAndTime to a valid Date object
  const deliveryDate = new Date(deliveryDateAndTime);

  // Validate the date
  if (isNaN(deliveryDate.getTime())) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid delivery date and time format.'
    );
  }

  // Get vendor timezone from coordinates
  const vendorCoords = vendorExist.vendor.location.coordinates;
  const vendorTimezones = find(vendorCoords[1], vendorCoords[0]);
  const vendorTimezone = vendorTimezones[0] || 'UTC';

  console.log(vendorTimezone,"🦥🦥🦥 VENDOR TIMEZONE!", deliveryDateAndTime);
  //@ts-expect-error timezone
  // Convert input time to vendor's timezone
  const deliveryDateTime = DateTime.fromISO(deliveryDateAndTime, { zone: vendorTimezone });
  const nowInVendorTZ = DateTime.now().setZone(vendorTimezone);

// Validate delivery time
if (deliveryDateTime < nowInVendorTZ) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Order cannot be created in the past. Vendor's local time: ${nowInVendorTZ.toFormat('yyyy-MM-dd HH:mm')}`
  );
}


   // Validate available days
   const requestedDay = deliveryDateTime.toFormat('EEEE');
   if (!vendorExist.vendor.availableDays?.includes(requestedDay)) {
     throw new ApiError(
       StatusCodes.BAD_REQUEST,
       `Vendor not available on ${requestedDay}. Available days: ${vendorExist.vendor.availableDays?.join(', ')}`
     );
   }
   validateOrderTime(
    deliveryDateTime.toJSDate(),
    vendorExist.vendor.operationStartTime!,
    vendorExist.vendor.operationEndTime!,
    vendorTimezone
  );
  // Calculate delivery fee and product price for custom orders
   // Handle custom orders
   if (isCustomOrder) {

    // Validate available time
    validateOrderTime(
      deliveryDateTime.toJSDate(),
      vendorExist.vendor.operationStartTime!,
      vendorExist.vendor.operationEndTime!,
      vendorTimezone
    );

    // Calculate delivery fee
    if (!payload.deliveryFee) {
      const distance = calculateDistance(
        [vendorCoords[0], vendorCoords[1]],
        payload.deliveryLocation.coordinates
      );
      payload.deliveryFee = Number((distance * Number(config.delivery_fee)!).toFixed(2));
    }
  }


  if (isSetup) {
    const setupDurationMs = getDuration(setupDuration);
    const setupStart = deliveryDateTime.minus({ milliseconds: setupDurationMs });

    if (setupStart < nowInVendorTZ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Setup time cannot be in the past. Vendor's local time: ${nowInVendorTZ.toFormat('HH:mm')}`
      );
    }

    payload.setupStartDateAndTime = setupStart.toJSDate();
    payload.setupFee = packageExist?.setupFee || 0;
  }

  // Convert times to UTC for database
  const deliveryUTC = deliveryDateTime.toUTC().toJSDate();
  const setupStartUTC = payload.setupStartDateAndTime 
    ? DateTime.fromJSDate(payload.setupStartDateAndTime).toUTC().toJSDate()
    : null;

  // Check for overlapping orders
  const query = isSetup && setupStartUTC
    ? {
        $or: [
          { 
            setupStartDateAndTime: { $lt: deliveryUTC },
            deliveryDateAndTime: { $gt: setupStartUTC }
          },
          {
            $and: [
              { setupStartDateAndTime: { $gte: setupStartUTC } },
              { setupStartDateAndTime: { $lte: deliveryUTC } }
            ]
          }
        ]
      }
    : {
        setupStartDateAndTime: { $lt: deliveryUTC },
        deliveryDateAndTime: { $gt: deliveryUTC }
      };

  const [existingOrder, customerExistingOrder] = await Promise.all([
    Order.findOne({
      vendorId: payload.vendorId,
      status: { $in: ['accepted', 'ongoing', 'started'] },
      ...query
    }),
    Order.findOne({
      customerId: payload.customerId,
      vendorId: payload.vendorId,
      status: { $in: ['pending', 'accepted', 'ongoing', 'started'] },
      ...query
    })
  ]);

  if (existingOrder) throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor is busy during this time slot');
  if (customerExistingOrder) throw new ApiError(StatusCodes.BAD_REQUEST, 'You have an existing order in this time slot');

  // Create order
  const result = await Order.create({
    ...payload,
    deliveryDateAndTime: deliveryUTC,
    setupStartDateAndTime: setupStartUTC
  });

  // Update cart
  await Cart.findOneAndUpdate(
    { customerId: payload.customerId },
    { $pull: { items: { vendorId: payload.vendorId } } }
  );

  // Send notification
  const notificationData = {
    title: `New order request from ${customerExist.customer.name}`,
    message: `${customerExist.customer.name} placed an order. Order ID: ${orderId}`
  };
  
  await orderNotificationAndDataSendWithSocket(
    'order',
    result._id,
    USER_ROLES.VENDOR,
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
    .populate('vendorId', {
      name: 1,
      email: 1,
      profileImg: 1,
      phone: 1,
      businessContact: 1,
      businessTitle: 1,
      businessAddress: 1,
      businessContactCountryCode: 1,
    })
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

  const { role } = user;

  if (role === USER_ROLES.CUSTOMER) {
    andCondition.push({ customerId: user.userId });
  } else {
    andCondition.push({ vendorId: user.userId });
  }

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
      businessContactCountryCode: 1,
      location: 1,
    })
    .populate('packageId', { title: 1 })
    .populate('serviceId', { title: 1, price: 1 })
    .populate('customerId', {
      name: 1,
      email: 1,
      phone: 1,
      address: 1,
      profileImg: 1,
    })
    .populate({
      path: 'products',
      select: 'quantity',
      populate: {
        path: 'product',
        select: 'name dailyRate hourlyRate',
      },
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

  const enrichedOrders = result.map(order =>
    calculateOrderCharges(order, user.role)
  );


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
  user:JwtPayload,
  id: string,
  payload: Pick<IOrder, 'status' | 'deliveryDeclineMessage'>
) => {
  if (!payload?.deliveryDeclineMessage) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Delivery Decline Message is required'
    );
  }

  const orderExists = await Order.findById({
    _id: id,
    status: 'accepted',
  })
    .populate<{vendorId:Partial<IVendor>}>('vendorId', { name: 1, deviceId:1 })
  if (!orderExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }


  if(orderExists.customerId != user.userId){
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not authorized to decline this order.')
  }

  //update the order status
  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'declined' },
    { $set: { ...payload } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order');
  }

  const notificationData ={
    title:`${orderExists.vendorId.name} has ${payload?.status} the order. Order ID: ${result?.orderId}`,
    message:`${payload?.deliveryDeclineMessage||"Order declined by the customer."}`
  }
  //send notification and data with socket
  await orderNotificationAndDataSendWithSocket('order', result._id, USER_ROLES.VENDOR, notificationData)
  return result;

};




const rejectOrAcceptOrder = async (id: string, payload: Partial<IOrder>) => {
  // Validate required fields for accepted orders
  if (payload.status === 'accepted' && !payload.amount) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount is required');
  }

  // Fetch the order with vendor and customer details
  const orderExists = await Order.findById({ _id: id, status: 'pending' })
    .populate<{ vendorId: IVendor & { location: {type: string, coordinates: number[]} } }>('vendorId', {
      name: 1,
      stripeId: 1,
      stripeConnected: 1,
      verifiedFlag: 1,
      location: 1, // Include location for timezone calculation
    })
    .populate<{ customerId: ICustomer }>('customerId', {
      name: 1,
      deviceId: 1,
    });

  if (!orderExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  const { vendorId: vendorData } = orderExists;
  const { stripeId, stripeConnected, verifiedFlag, name: vendorName, location } = vendorData;

  // Validate vendor payment setup
  if (!stripeId || !stripeConnected) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please add your payment method first'
    );
  }

  // Validate vendor account verification
  if (!verifiedFlag) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your account information is not verified. Please verify your account first.'
    );
  }
  const vendorCoords = location?.coordinates;
  const vendorTimezones = find(vendorCoords[1], vendorCoords[0]);
  const vendorTimezone = vendorTimezones[0] || 'UTC';

  // Handle order acceptance logic
  if (payload.status === 'accepted') {
    // Get vendor timezone from coordinates
   
    // Convert delivery and setup times to vendor's local timezone
    const deliveryDateTime = DateTime.fromJSDate(orderExists.deliveryDateAndTime, { zone: 'utc' })
      .setZone(vendorTimezone);

    // Check for conflicting orders
    let conflictingOrder;
    if (orderExists.isSetup) {
      const setupStartUTC = DateTime.fromJSDate(orderExists.setupStartDateAndTime, { zone: 'utc' })
        .setZone(vendorTimezone)
        .toUTC()
        .toJSDate();

      const deliveryUTC = deliveryDateTime.toUTC().toJSDate();

      conflictingOrder = await Order.findOne({
        vendorId: orderExists.vendorId,
        $or: [
          {
            setupStartDateAndTime: { $lt: deliveryUTC },
            deliveryDateAndTime: { $gt: setupStartUTC },
          },
          {
            setupStartDateAndTime: { $gte: setupStartUTC, $lte: deliveryUTC },
          },
        ],
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
        'The vendor already has an order during this time slot.'
      );
    }

    // Handle setup duration for setup orders
    if (orderExists.isSetup) {
      if (!payload.setupDuration) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Setup duration is required for setup orders.'
        );
      }

      const setupDurationMs = getDuration(payload.setupDuration);
      const setupStartDateTime = deliveryDateTime.minus({ milliseconds: setupDurationMs });

      // Validate setup start time in vendor's local time
      if (setupStartDateTime < DateTime.now().setZone(vendorTimezone)) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Setup time cannot be in the past. Vendor's local time: ${DateTime.now().setZone(vendorTimezone).toFormat('HH:mm')}`
        );
      }

      // Convert back to UTC for storage
      payload.setupStartDateAndTime = setupStartDateTime.toUTC().toJSDate();
      payload.setupFee = payload.setupFee || orderExists.setupFee;
    }
  }

  // Update the order status
  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { ...payload } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update order.');
  }

  // Send notification with local time
  const deliveryDateLocal = DateTime.fromJSDate(orderExists.deliveryDateAndTime, { zone: 'utc' })
    .setZone(vendorTimezone)
    .toLocaleString(DateTime.DATE_HUGE);

  const notificationData = {
    title: `${vendorName} has ${payload?.status} the order. Order ID: ${result?.orderId}`,
    message: `Your order request for #${orderExists.orderId} has been confirmed by ${vendorName}. The delivery date is ${deliveryDateLocal}.`,
  };

  await orderNotificationAndDataSendWithSocket(
    'order',
    result._id,
    USER_ROLES.CUSTOMER,
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
  return (distance * Number(config.delivery_fee)).toFixed(2);

};

const startOrderDelivery = async (id: string) => {
  const isOrderExist = await Order.findById({ _id: id, status: 'ongoing' }).populate<{customerId:Partial<ICustomer>}>('customerId', { name: 1 }).populate<{vendorId:Partial<IVendor>}>('vendorId', { name: 1 });
  if (!isOrderExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
  }

  //check if the vendor already has any other order as started
  const vendorAvailable = await Order.findOne({
    vendorId: isOrderExist.vendorId,
    status: { $in: ['started'] },
    _id: { $ne: id },
  });

  if (vendorAvailable) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have an order in delivery process'
    );
  }

  const result = await Order.findOneAndUpdate(
    { _id: id, status: 'ongoing' },
    { $set: { status: 'started' } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to change the order status'
    );
  }

  const {name:vendorName} = isOrderExist.vendorId;
  const notificationData ={
    title:`Delivery has been started for order ${result.orderId}`,
    message:`${vendorName} has started Order delivery for ID:${result.orderId} has been started. Track your order for more details.`
  }

  //send notification and data with socket
  await orderNotificationAndDataSendWithSocket('order', result._id, USER_ROLES.CUSTOMER, notificationData)

  return result;
};

export const OrderService = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getAllOrderByUserId,
  declineOrder,
  rejectOrAcceptOrder,
  getDeliveryCharge,
  startOrderDelivery,
};
