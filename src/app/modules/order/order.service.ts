import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import generateOTP from '../../../util/generateOTP';
import { Package } from '../package/package.model';
import { Service } from '../service/service.model';
import { Vendor } from '../vendor/vendor.model';
import { IOrder, IOrderFilter } from './order.interface';
import { Order } from './order.model';
import { generateCustomOrderId } from './order.utils';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';

const createOrder = async (payload: IOrder) => {
  //generate a unique order id
  const orderId = await generateCustomOrderId();

  payload.orderId = orderId;
  //generate a random otp for delivery verification code
  const deliveryCode = generateOTP();
  payload.deliveryReceivingCode = deliveryCode.toString();

  const vendorExist = await Vendor.findById(payload.vendorId);

  if (!vendorExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor does not exist');
  }

  const serviceExist = await Service.findById(payload.serviceId);

  if (!serviceExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service does not exist');
  }

  const packageExist = await Package.findById(payload.packageId);

  if (!packageExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Package does not exist');
  }

  const existingOrder = await Order.findOne({
    vendorId: payload.vendorId, // Ensure it's the same vendor
    $or: [
      {
        serviceStartDateTime: { $lt: payload.serviceEndDateTime },
        serviceEndDateTime: { $gt: payload.serviceStartDateTime },
      },
    ],
  });

  if (existingOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'The vendor is already busy during this time slot.'
    );
  }

  const date = payload.serviceStartDateTime.toString().split('T')[0];

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

  const result = await Order.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create order');
  }
  return result;
};

const getAllOrders = async () => {
  const result = await Order.find({});
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }
  return result;
};

// const getAllOrderByUserId = async (
//   user: JwtPayload,
//   filterData: Partial<IOrderFilter>
// ) => {
//   const andCondition = [];

//   if (filterData.status) {
//     andCondition.push({
//       status: filterData.status,
//     });
//   }

//   if (filterData.serviceStartDateTime) {
//     andCondition.push({
//       serviceStartDateTime: {
//         $gte: filterData.serviceStartDateTime,
//         $lt: filterData.serviceEndDateTime,
//       },
//     });
//   }

//   if (filterData.serviceEndDateTime) {
//     andCondition.push({
//       serviceEndDateTime: {
//         $gte: filterData.serviceStartDateTime,
//         $lt: filterData.serviceEndDateTime,
//       },
//     });
//   }

//   const { role } = user;

//   role === USER_ROLES.CUSTOMER
//     ? andCondition.push({ customerId: user.userId })
//     : andCondition.push({ vendorId: user.userId });

//   const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

//   const result = await Order.find(whereConditions)
//     .populate('vendorId', { name: 1, email: 1, phone: 1, address: 1 })
//     .populate('packageId')
//     .populate('serviceId', { title: 1, price: 1 })
//     .populate('paymentId')
//     .populate('customerId', { name: 1, email: 1, phone: 1, address: 1 })
//     .lean();

//   if (!result) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
//   }
//   return result;
// };

const getAllOrderByUserId = async (
  user: JwtPayload,
  filterData: Partial<IOrderFilter>
) => {
  const andCondition: any[] = [];

  // Add filter for status
  if (filterData.status) {
    andCondition.push({
      status: filterData.status,
    });
  }

  // Add filter for serviceStartDateTime
  if (filterData.serviceStartDateTime) {
    const startDate = new Date(filterData.serviceStartDateTime);
    const endDate = filterData.serviceEndDateTime
      ? new Date(filterData.serviceEndDateTime)
      : new Date(startDate.setHours(23, 59, 59, 999)); // If serviceEndDateTime is not provided, set the end to midnight of that day.

    andCondition.push({
      serviceStartDateTime: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  // Add customer or vendor filtering based on the user's role
  const { role } = user;
  if (role === USER_ROLES.CUSTOMER) {
    andCondition.push({ customerId: user.userId });
  } else {
    andCondition.push({ vendorId: user.userId });
  }

  // Apply the $and condition if there are any filters
  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  // Query to get orders
  const result = await Order.find(whereConditions)
    .populate('vendorId', { name: 1, email: 1, phone: 1, address: 1 })
    .populate('packageId')
    .populate('serviceId', { title: 1, price: 1 })
    .populate('paymentId')
    .populate('customerId', { name: 1, email: 1, phone: 1, address: 1 })
    .lean();

  // Handle if no orders are found
  if (!result || result.length === 0) {
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
