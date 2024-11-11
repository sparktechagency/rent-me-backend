import { parse, format } from 'date-fns';
import { Order } from '../order/order.model';
import { Service } from '../service/service.model';
import { convertTo24Hour } from '../../../helpers/dateFormatHelper';

// Helper function to convert 12-hour time format to 24-hour format
export const buildDateTimeFilter = async (
  serviceDate: string,
  serviceTime: string
) => {
  const parsedDate = parse(serviceDate, 'dd-MM-yyyy', new Date());
  const [startTimeStr, endTimeStr] = serviceTime.split(' - ');

  const serviceStartDateTime = new Date(
    `${format(parsedDate, 'yyyy-MM-dd')}T${convertTo24Hour(startTimeStr)}:00Z`
  );
  const serviceEndDateTime = new Date(
    `${format(parsedDate, 'yyyy-MM-dd')}T${convertTo24Hour(endTimeStr)}:00Z`
  );
  console.log(serviceStartDateTime, serviceEndDateTime);

  const busyVendorIds = await Order.find({
    status: 'accepted',
    $and: [
      {
        serviceStartDateTime: { $lt: serviceEndDateTime },
        serviceEndDateTime: { $gt: serviceStartDateTime },
      },
    ],
  }).distinct('vendorId');

  return busyVendorIds;
};

// Helper function to find vendor IDs by budget range in Service collection
export const findVendorsByBudget = async (
  minBudget?: number,
  maxBudget?: number
) => {
  const budgetConditions: any = {};

  if (minBudget !== undefined) {
    budgetConditions.estBudget = { $gte: minBudget };
  }
  if (maxBudget !== undefined) {
    budgetConditions.estBudget = {
      ...budgetConditions.estBudget,
      $lte: maxBudget,
    };
  }

  // Fetch vendor IDs that match the budget criteria
  const services = await Service.find(budgetConditions).distinct('vendorId');
  return services;
};

export const buildRangeFilter = (field: string, min?: number, max?: number) => {
  const rangeFilter: any = {};
  if (min !== undefined) rangeFilter.$gte = min;
  if (max !== undefined) rangeFilter.$lte = max;
  return Object.keys(rangeFilter).length > 0 ? { [field]: rangeFilter } : null;
};
