import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Order } from './order.model';

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

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return Number(distance.toFixed(2));
}

// export const validateOrderTime = (
//   serviceStartDateTime: Date,
//   serviceEndDateTime: Date,
//   vendorOperationStart: string,
//   vendorOperationEnd: string
// ) => {
//   const serviceStartUTC = new Date(serviceStartDateTime.toISOString());
//   const serviceEndUTC = new Date(serviceEndDateTime.toISOString());

//   const { hour: startHour, minute: startMinute } =
//     convertTo24Hour(vendorOperationStart);
//   const { hour: endHour, minute: endMinute } =
//     convertTo24Hour(vendorOperationEnd);

//   const operationStart = new Date(serviceStartUTC);
//   const operationEnd = new Date(serviceStartUTC);

//   // Set vendor's operation hours in UTC
//   operationStart.setUTCHours(startHour, startMinute, 0, 0);
//   operationEnd.setUTCHours(endHour, endMinute, 0, 0);

//   // Validate that the order time falls within the vendor's operation time
//   if (serviceStartUTC < operationStart || serviceEndUTC > operationEnd) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       `Order time must be between ${vendorOperationStart} and ${vendorOperationEnd}`
//     );
//   }
// };

export const validateOrderTime = (
  serviceEndDateTime: Date,
  vendorOperationStart: string,
  vendorOperationEnd: string
) => {
  // Convert service times to UTC

  const serviceEndUTC = new Date(serviceEndDateTime.toISOString());

  // Convert vendor operation times to 24-hour format and then to UTC
  const { hour: startHour, minute: startMinute } =
    convertTo24Hour(vendorOperationStart);
  const { hour: endHour, minute: endMinute } =
    convertTo24Hour(vendorOperationEnd);

  const operationStart = new Date(serviceEndUTC);
  const operationEnd = new Date(serviceEndUTC);

  // Set vendor's operation hours in UTC
  operationStart.setUTCHours(startHour, startMinute, 0, 0);
  operationEnd.setUTCHours(endHour, endMinute, 0, 0);

  // Validate that the order time falls within the vendor's operation hours
  if (serviceEndUTC < operationStart || serviceEndUTC > operationEnd) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Order time must be between ${vendorOperationStart} and ${vendorOperationEnd}`
    );
  }
};

// export const validateSetupTime = async (
//   setupStartTime: Date,
//   setupEndTime: Date,
//   vendorId: Types.ObjectId,
//   operationStartTime: string,
//   operationEndTime: string
// ) => {
//   // Validate operation hours for each day in the setup duration
//   const currentTime = setupStartTime;

//   while (currentTime < setupEndTime) {
//     const { hour: startHour, minute: startMinute } =
//       convertTo24Hour(operationStartTime);
//     const { hour: endHour, minute: endMinute } =
//       convertTo24Hour(operationEndTime);

//     // Set operation hours for the current day
//     const operationStart = new Date(currentTime);
//     const operationEnd = new Date(currentTime);

//     operationStart.setUTCHours(startHour, startMinute, 0, 0);
//     operationEnd.setUTCHours(endHour, endMinute, 0, 0);

//     // Check if the vendor is available during this time
//     if (setupStartTime < operationStart || setupEndTime > operationEnd) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         `Vendor is not available during the requested setup time.`
//       );
//     }

//     // Check if vendor is already busy on this day
//     const conflictingOrder = await Order.findOne({
//       vendorId: vendorId,
//       status: { $in: ['accepted', 'ongoing', 'confirmed', 'on the way'] },
//       deliveryDate: { $gte: operationStart, $lte: operationEnd },
//     });

//     if (conflictingOrder) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         `The vendor is already busy during the requested setup time.`
//       );
//     }

//     // Move to the next day for multi-day setups
//     currentTime.setDate(currentTime.getDate() + 1);
//   }
// };

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
