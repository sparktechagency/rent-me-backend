import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Order } from './order.model';
import { USER_ROLES } from '../../../enums/user';
import config from '../../../config';
import { Types } from 'mongoose';
import { IOrder } from './order.interface';
import { sendDataWithSocket, sendNotification } from '../../../helpers/sendNotificationHelper';


const getLastOrderId = async () => {
  const lastOrderId = await Order.findOne({}).sort({ createdAt: -1 }).lean();

  return lastOrderId?.orderId ? lastOrderId.orderId : undefined;
};

export const generateCustomOrderId = async () => {
  const currentId = (await getLastOrderId()) || (0).toString().padStart(5, '0');
  let currentIdLength = currentId.length;
  if (currentIdLength < 5) currentIdLength = 5;

  const maxValue = Math.pow(10, currentIdLength) - 1;

  if (parseInt(currentId) >= maxValue) {
    currentIdLength += 1;
  }

  // Increment the ID and pad it to the new length
  const incrementedId = (parseInt(currentId) + 1)
    .toString()
    .padStart(currentIdLength, '0');

  return incrementedId;
};

export const convertTo24Hour = (time12hr: string) => {
  const [hours, minutes, period] = time12hr
    .match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)!
    .slice(1);
  let hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);

  if (period === 'AM' && hour === 12) {
    hour = 0;
  } else if (period === 'PM' && hour !== 12) {
    hour += 12;
  }

  return { hour, minute };
};

export function calculateDistance(
  coords1: [number, number],
  coords2: [number, number]
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const [lon1, lat1] = coords1; // [longitude, latitude]
  const [lon2, lat2] = coords2;
  //convert km to miles
  const R = 3959; // Radius of the Earth in miles

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in miles

  return Number(distance.toFixed(2));
}



export const validateOrderTime = (
  serviceEndDateTime: Date | string,
  vendorOperationStart: string,
  vendorOperationEnd: string
) => {
  // Convert serviceEndDateTime to a Date object
  const serviceEndLocal = new Date(serviceEndDateTime);

  // Check if the parsed date is valid
  if (isNaN(serviceEndLocal.getTime())) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid service end date and time format.'
    );
  }

  // Convert vendor operation times to 24-hour format
  const { hour: startHour, minute: startMinute } =
    convertTo24Hour(vendorOperationStart); // "09:00 AM" -> { hour: 9, minute: 0 }
  const { hour: endHour, minute: endMinute } =
    convertTo24Hour(vendorOperationEnd); // "05:00 PM" -> { hour: 17, minute: 0 }

  // Create Date objects for operationStart and operationEnd in LOCAL TIME
  const operationStart = new Date(serviceEndLocal);
  const operationEnd = new Date(serviceEndLocal);

  // Set vendor's operation hours in LOCAL TIME
  operationStart.setHours(startHour, startMinute, 0, 0);
  operationEnd.setHours(endHour, endMinute, 0, 0);

  console.log(
    'Operation Start (Local):',
    operationStart.toLocaleString(),
    'Operation End (Local):',
    operationEnd.toLocaleString(),
    'Service End (Local):',
    serviceEndLocal.toLocaleString()
  );

  // Handle cases where operationEnd crosses midnight
  if (operationEnd < operationStart) {
    operationEnd.setDate(operationEnd.getDate() + 1);
  }

  // Validate that the order time falls within the vendor's operation hours
  if (serviceEndLocal < operationStart || serviceEndLocal > operationEnd) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Order time must be between ${vendorOperationStart} and ${vendorOperationEnd}`
    );
  }
};



export const parseDuration = (duration: string): number => {
  const timeUnits: { [key: string]: number } = {
    min: 60 * 1000, // minute in milliseconds
    hr: 60 * 60 * 1000, // hour in milliseconds
    d: 24 * 60 * 60 * 1000, // day in milliseconds
  };

  const match = duration.match(/^(\d+)(min|hr|d)$/);
  if (!match) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid setup duration format.'
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as keyof typeof timeUnits; // Cast `unit` to a valid key of `timeUnits`

  return value * timeUnits[unit];
};

export const getDuration = (duration: string): number => {
  const timeUnits: { [key: string]: number } = {
    min: 60 * 1000, // minute in milliseconds
    hr: 60 * 60 * 1000, // hour in milliseconds
    d: 24 * 60 * 60 * 1000, // day in milliseconds
  };

  // Match the original format (e.g., '5min', '2hr', '1d')
  const simpleMatch = duration.match(/^(\d+)(min|hr|d)$/);
  if (simpleMatch) {
    const value = parseInt(simpleMatch[1], 10);
    const unit = simpleMatch[2] as keyof typeof timeUnits;
    return value * timeUnits[unit];
  }

  // Match the 'dd:hh:mm' format
  const complexMatch = duration.match(/^(\d+):(\d+):(\d+)$/);
  if (complexMatch) {
    const days = parseInt(complexMatch[1], 10);
    const hours = parseInt(complexMatch[2], 10);
    const minutes = parseInt(complexMatch[3], 10);

    if (hours < 0 || hours > 23) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Hours must be between 0 and 23.'
      );
    }
    if (minutes < 0 || minutes > 59) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Minutes must be between 0 and 59.'
      );
    }

    return (
      days * timeUnits['d'] +
      hours * timeUnits['hr'] +
      minutes * timeUnits['min']
    );
  }

  // Match the 'hh:mm' format
  const hourMinuteMatch = duration.match(/^(\d+):(\d+)$/);
  if (hourMinuteMatch) {
    const hours = parseInt(hourMinuteMatch[1], 10);
    const minutes = parseInt(hourMinuteMatch[2], 10);

    if (hours < 0 || hours > 23) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Hours must be between 0 and 23.'
      );
    }
    if (minutes < 0 || minutes > 59) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Minutes must be between 0 and 59.'
      );
    }

    return hours * timeUnits['hr'] + minutes * timeUnits['min'];
  }

  // If neither pattern matches, throw an error
  throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid setup duration format.');
};




export const calculateOrderCharges = (
  order,
  userRole,
) => {
  const applicationChargeRate = Number(config.application_fee);
  const ccChargeRate = Number(config.customer_cc_rate);
  const instantTransferFeeRate = Number(config.instant_transfer_fee);

  const enrichedOrder = { ...order };

  // Validate required fields
  if (!order?.amount && !order?.offeredAmount) {
    throw new Error("Either amount or offeredAmount must be provided.");
  }

  const orderAmount = order?.amount || order.offeredAmount;

  // Calculate CC charge for customers
  if (userRole === USER_ROLES.CUSTOMER) {
    enrichedOrder.customerCCChargeRate = ccChargeRate;
    enrichedOrder.customerCCCharge = orderAmount * ccChargeRate;
  }

  // Calculate vendor-specific fields
  if (userRole === USER_ROLES.VENDOR) {
    const applicationCharge = Math.floor(
      orderAmount *
      (order.isInstantTransfer ? instantTransferFeeRate : applicationChargeRate)
    );

    const instantTransferFee = order.isInstantTransfer
      ? Math.floor(orderAmount * instantTransferFeeRate)
      : 0;

    if (order.isInstantTransfer) {
      enrichedOrder.instantTransferChargeRate = instantTransferFeeRate;
      enrichedOrder.instantTransferCharge = instantTransferFee;
    } else {
      enrichedOrder.applicationChargeRate = applicationChargeRate;
    }

    enrichedOrder.vendorReceivable = Math.floor(
      orderAmount +
      (order.isSetup ? order?.setupFee : 0) +
      order.deliveryFee -
      (applicationCharge + instantTransferFee) -
      (enrichedOrder.customerCCCharge || 0)
    );

    enrichedOrder.applicationCharge = applicationCharge;
  }

  // Calculate subTotal including optional fields
  const setupFee = order.setupFee || 0;
  const deliveryCharge = order.deliveryFee || 0;
  enrichedOrder.subTotal = Math.floor(
    orderAmount + setupFee + deliveryCharge + (enrichedOrder.customerCCCharge || 0)
  );

  return enrichedOrder;
};


export const orderSocketDataHelper = async (namespace:string,sendTo:string | Types.ObjectId,orderId:Types.ObjectId,role:string )=>{

   const order = await Order.findById(orderId)
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
      .populate('paymentId')
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
      .populate('review', { rating: 1, comment: 1 }).lean()




   const enrichData =  calculateOrderCharges(order, role)


  await sendDataWithSocket(
    namespace,
    sendTo,
    enrichData
  );

}






// Helper function to send notification and socket event
export const sendOrderNotificationAndSocketEvent = async (
  deviceId: string,
  orderDetails: IOrder,
  role:string,
  sendTo:Types.ObjectId,
  notificationData:{title:string, message:string},
  namespace?:string
) => {



if(namespace){
  await orderSocketDataHelper(namespace, sendTo, orderDetails._id,role)
}


  await sendNotification('getNotification', sendTo, {
    userId: sendTo,
    title: notificationData.title,
    message: notificationData.message,
    type: role,
  },{
    deviceId: deviceId,
    destination: 'order',
    role: role,
    id: orderDetails._id as unknown as string,
    icon: 'https://res.cloudinary.com/di2erk78w/image/upload/v1739447789/B694F238-61D7-490D-9F1B-3B88CD6DD094_1_1_kpjwlx.png'
  })


};



