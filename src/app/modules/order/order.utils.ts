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
  const distance = R * c; // Distance in kilometers

  return Number(distance.toFixed(2));
}

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
