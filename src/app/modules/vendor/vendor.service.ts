import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Vendor } from './vendor.model';
import { IVendor, IVendorFilterableFields } from './vendor.interface';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import { userSearchableFields } from '../user/user.constants';
import { SortOrder, Types } from 'mongoose';
import {
  buildDateTimeFilter,
  buildRangeFilter,
  findVendorsByBudget,
  getDateRangeAndIntervals,
  mapDataToIntervals,
} from './vendor.utils';
import { Service } from '../service/service.model';
import { Order } from '../order/order.model';

const updateVendorProfile = async (
  user: JwtPayload,
  payload: Partial<IVendor>
) => {
  const { id, userId } = user;

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  console.log(payload);

  const result = await Vendor.findOneAndUpdate({ _id: userId }, payload, {
    new: true,
  });

  //need to be fixed!!!
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
  }

  return result;
};

const getVendorProfile = async (user: JwtPayload) => {
  const { id, userId } = user;

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const result = await Vendor.findById({ _id: userId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get vendor profile');
  }

  // Get the count of services for this vendor
  const serviceCount = await Service.countDocuments({ vendorId: userId });

  const vendorObjectId = new Types.ObjectId(userId);

  // Calculate the total revenue from completed orders
  const revenueResult = await Order.aggregate([
    {
      $match: {
        vendorId: vendorObjectId,
        status: 'completed', // Filter by completed orders
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
      },
    },
  ]);
  console.log(revenueResult);
  const totalRevenue = revenueResult[0]?.totalRevenue || 0;

  return {
    ...result.toObject(),
    serviceCount,
    totalRevenue,
  };
};

const getSingleVendor = async (id: string) => {
  const result = await Vendor.findOne({ id: id });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get vendor');
  }
  return result;
};

const deleteVendorProfile = async (user: JwtPayload) => {
  const { id, userId } = user;

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const result = await User.findOneAndUpdate({ _id: id }, { status: 'delete' });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete vendor');
  }
};

const getAllVendor = async (filters: IVendorFilterableFields) => {
  const {
    searchTerm,
    sortBy,
    sortOrder,
    minOrderCompleted,
    maxOrderCompleted,
    minReviews,
    maxReviews,
    minRating,
    maxRating,
    serviceDate,
    serviceTime,
    minBudget,
    maxBudget,
    customerLat,
    customerLng,
    radius,
    ...filterData
  } = filters;
  const andCondition = [];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  //Check whether a vendor is available or not for a given date and time range
  if (serviceDate && serviceTime) {
    const busyVendorIds = await buildDateTimeFilter(serviceDate, serviceTime);
    andCondition.push({
      _id: { $nin: busyVendorIds },
    });
  }

  // Budget range filtering based on service data
  if (minBudget !== undefined || maxBudget !== undefined) {
    const budgetVendorIds = await findVendorsByBudget(minBudget, maxBudget);
    andCondition.push({
      _id: { $in: budgetVendorIds },
    });
    console.log(budgetVendorIds);
  }

  // Add range filters
  const orderCompletedFilter = buildRangeFilter(
    'orderCompleted',
    minOrderCompleted,
    maxOrderCompleted
  );
  if (orderCompletedFilter) andCondition.push(orderCompletedFilter);

  const ratingFilter = buildRangeFilter('rating', minRating, maxRating);
  if (ratingFilter) andCondition.push(ratingFilter);

  const reviewsFilter = buildRangeFilter(
    'totalReviews',
    minReviews,
    maxReviews
  );
  if (reviewsFilter) andCondition.push(reviewsFilter);

  // Radius filter based on customer location
  console.log(customerLat, customerLng, radius);
  if (customerLat && customerLng && radius) {
    andCondition.push({
      location: {
        $geoWithin: {
          $centerSphere: [
            [Number(customerLat), Number(customerLng)], // [lng, lat] format for GeoJSON
            radius / 6378.1, // Radius in radians (6378.1 is Earth's radius in kilometers)
          ],
        },
      },
    });
  }

  //check if rating based sorting is needed
  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await Vendor.find(whereConditions, {
    id: 1,
    name: 1,
    email: 1,
    rating: 1,
    totalReviews: 1,
    orderCompleted: 1,
    isAvailable: 1,
    contact: 1,
    address: 1,
  }).lean();

  return result;
};

const getVendorRevenue = async (
  user: JwtPayload,
  range: string = '1'
): Promise<{ key: string; value: number }[]> => {
  try {
    const { startDate, endDate, intervals, intervalMilliseconds } =
      getDateRangeAndIntervals(range);

    const revenueData = await Order.aggregate([
      {
        $match: {
          vendorId: new Types.ObjectId(user.userId),
          status: 'completed',
          serviceStartDateTime: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          offeredAmount: 1,
          intervalStart: {
            $floor: {
              $divide: [
                { $subtract: ['$serviceStartDateTime', startDate] },
                intervalMilliseconds,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: '$intervalStart',
          totalRevenue: { $sum: '$offeredAmount' },
        },
      },
    ]);

    mapDataToIntervals(intervals, revenueData, 'totalRevenue');

    return intervals;
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get vendor revenue');
  }
};

const getVendorOrders = async (
  user: JwtPayload,
  range: string = '1' // Default to 1 month
): Promise<{ key: string; value: number }[]> => {
  try {
    const { startDate, endDate, intervals, intervalMilliseconds } =
      getDateRangeAndIntervals(range);

    const orders = await Order.aggregate([
      {
        $match: {
          vendorId: new Types.ObjectId(user.userId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          createdAt: 1,
          orderInterval: {
            $floor: {
              $divide: [
                { $subtract: ['$createdAt', startDate] },
                intervalMilliseconds, // Convert intervalDays to milliseconds
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: '$orderInterval', // Group by calculated interval
          count: { $sum: 1 }, // Count the number of orders per interval
        },
      },
    ]);

    // console.log(orders);

    mapDataToIntervals(intervals, orders, 'count');

    return intervals;
  } catch (error) {
    console.log(error);
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to get vendor orders over time'
    );
  }
};

//customer Retention

export const getCustomerRetentionData = async (
  user: JwtPayload,
  range: string | '1' = '1' // Default to 1 month
): Promise<
  {
    key: string;
    value: number;
    totalOrders: number;
    completedOrders: number;
    failedOrders: number;
  }[]
> => {
  try {
    const months = parseInt(range, 10) || 1;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const intervalDays = (months * 30) / 10;
    const intervalMilliseconds = intervalDays * 24 * 60 * 60 * 1000;
    const totalIntervals = Math.floor(
      (endDate.getTime() - startDate.getTime()) / intervalMilliseconds
    );

    // Initialize intervals with value property
    const intervals: {
      key: string;
      value: number;
      totalOrders: number;
      completedOrders: number;
      failedOrders: number;
    }[] = Array.from({ length: totalIntervals }, (_, i) => ({
      key: `${i * intervalDays + 1}-${(i + 1) * intervalDays}`,
      value: 0, // Initial value is 0 for retention rate
      totalOrders: 0,
      completedOrders: 0,
      failedOrders: 0,
    }));

    // Fetch placed, completed, and failed orders in parallel
    const [placedOrders, completedOrders, failedOrders] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            vendorId: new Types.ObjectId(user.userId),
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            createdAt: 1,
            orderInterval: {
              $floor: {
                $divide: [
                  { $subtract: ['$createdAt', startDate] },
                  intervalMilliseconds,
                ],
              },
            },
          },
        },
        { $group: { _id: '$orderInterval', totalOrders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            vendorId: new Types.ObjectId(user.userId),
            status: { $in: ['completed', 'accepted'] },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            createdAt: 1,
            orderInterval: {
              $floor: {
                $divide: [
                  { $subtract: ['$createdAt', startDate] },
                  intervalMilliseconds,
                ],
              },
            },
          },
        },
        { $group: { _id: '$orderInterval', completedOrders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            vendorId: new Types.ObjectId(user.userId),
            status: { $in: ['cancelled', 'rejected', 'decline'] },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            createdAt: 1,
            orderInterval: {
              $floor: {
                $divide: [
                  { $subtract: ['$createdAt', startDate] },
                  intervalMilliseconds,
                ],
              },
            },
          },
        },
        { $group: { _id: '$orderInterval', failedOrders: { $sum: 1 } } },
      ]),
    ]);

    // Fill intervals with data
    placedOrders.forEach(({ _id, totalOrders }) => {
      if (_id < intervals.length) intervals[_id].totalOrders = totalOrders;
    });
    completedOrders.forEach(({ _id, completedOrders }) => {
      if (_id < intervals.length)
        intervals[_id].completedOrders = completedOrders;
    });
    failedOrders.forEach(({ _id, failedOrders }) => {
      if (_id < intervals.length) intervals[_id].failedOrders = failedOrders;
    });

    // Calculate retention rate and update each interval
    intervals.forEach(interval => {
      const { totalOrders, completedOrders, failedOrders } = interval;
      interval.value =
        totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    });

    return intervals;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to calculate customer retention');
  }
};

export const VendorService = {
  updateVendorProfile,
  getVendorProfile,
  getSingleVendor,
  deleteVendorProfile,
  getAllVendor,
  getVendorRevenue,
  getVendorOrders,
  getCustomerRetentionData,
};
