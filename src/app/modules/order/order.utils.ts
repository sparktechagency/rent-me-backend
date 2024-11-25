import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Order } from './order.model';

const getLastOrderId = async () => {
  const lastOrderId = await Order.findOne({}).sort({ createdAt: -1 }).lean();

  return lastOrderId?.orderId ? lastOrderId.orderId : undefined;
};

export const generateCustomOrderId = async () => {
  const currentId = (await getLastOrderId()) || (0).toString().padStart(5, '0');

  let incrementedId = (parseInt(currentId) + 1).toString().padStart(5, '0');
  incrementedId = `${incrementedId}`;

  return incrementedId;
};

const convertTo24Hour = (time12hr: string) => {
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

export const validateOrderTime = (
  serviceStartDateTime: Date,
  serviceEndDateTime: Date,
  vendorOperationStart: string,
  vendorOperationEnd: string
) => {
  const serviceStartUTC = new Date(serviceStartDateTime.toISOString());
  const serviceEndUTC = new Date(serviceEndDateTime.toISOString());

  const { hour: startHour, minute: startMinute } =
    convertTo24Hour(vendorOperationStart);
  const { hour: endHour, minute: endMinute } =
    convertTo24Hour(vendorOperationEnd);

  const operationStart = new Date(serviceStartUTC);
  const operationEnd = new Date(serviceStartUTC);

  // Set vendor's operation hours in UTC
  operationStart.setUTCHours(startHour, startMinute, 0, 0);
  operationEnd.setUTCHours(endHour, endMinute, 0, 0);

  // Validate that the order time falls within the vendor's operation time
  if (serviceStartUTC < operationStart || serviceEndUTC > operationEnd) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Order time must be between ${vendorOperationStart} and ${vendorOperationEnd}`
    );
  }
};
