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
  handleObjectUpdate,
  mapDataToIntervals,
} from './vendor.utils';
import { Service } from '../service/service.model';
import { Order } from '../order/order.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

const updateVendorProfile = async (
  user: JwtPayload,
  payload: Partial<IVendor>
) => {
  const { id, userId } = user;
  const { address, socialLinks, businessAddress, ...restData } = payload;

  let updatedVendorData = { ...restData }; // Create a mutable object

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  // Update nested objects dynamically
  if (address && Object.keys(address).length > 0) {
    updatedVendorData = handleObjectUpdate(
      address,
      updatedVendorData,
      'address'
    );
  }

  if (businessAddress && Object.keys(businessAddress).length > 0) {
    updatedVendorData = handleObjectUpdate(
      businessAddress,
      updatedVendorData,
      'businessAddress'
    );
  }

  if (socialLinks && Object.keys(socialLinks).length > 0) {
    updatedVendorData = handleObjectUpdate(
      socialLinks,
      updatedVendorData,
      'socialLinks'
    );
  }

  // Perform the database update
  const result = await Vendor.findOneAndUpdate(
    { _id: userId },
    updatedVendorData,
    {
      new: true,
    }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
  }

  return result;
};

const getBusinessInformationFromVendor = async (
  user: JwtPayload,
  payload: Partial<IVendor>
) => {
  const session = await Vendor.startSession(); // Start a session
  session.startTransaction();

  try {
    const { id, userId } = user;

    const isExistUser = await User.isExistUserById(id);
    if (!isExistUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
    }

    // Update Vendor
    const result = await Vendor.findOneAndUpdate(
      { _id: userId },
      payload,
      { new: true, session } // Pass session here
    );

    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
    }

    // Update User
    const changeStatus = await User.findOneAndUpdate(
      { vendor: userId },
      { needInformation: false },
      { new: true, session } // Pass session here
    );

    if (!changeStatus) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to update information need status'
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return result;
  } catch (error) {
    // Rollback the transaction in case of any error
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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
  const { id } = user;

  // Check if the user exists
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  // Check for running orders
  const hasRunningOrder = await Order.exists({
    vendorId: id,
    status: { $in: ['ongoing', 'accepted'] },
  });

  if (hasRunningOrder) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have ongoing orders. Please complete them before deleting your profile.'
    );
  }

  // Mark user as deleted
  const result = await User.findByIdAndUpdate(
    id,
    { status: 'deleted' },
    { new: true } // Return the updated document
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete vendor profile.'
    );
  }

  return { message: 'Vendor profile deleted successfully.' };
};

const getAllVendor = async (
  filters: IVendorFilterableFields,
  paginationOptions: IPaginationOptions
) => {
  const {
    searchTerm,
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

  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);

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

  // Step 1: Get vendor IDs of active users
  const activeUserVendors = await User.find(
    { status: 'active', needInformation: false, approvedByAdmin: true }, // Filter for active users
    'vendor' // Only select the `vendor` field
  ).lean();

  const activeVendorIds = activeUserVendors.map(user => user.vendor);

  // Step 2: Query the Vendor collection using these vendor IDs
  const vendors = await Vendor.find(
    {
      ...whereConditions,
      _id: { $in: activeVendorIds }, // Filter by vendor IDs
    },
    {
      id: 1,
      name: 1,
      email: 1,
      rating: 1,
      totalReviews: 1,
      orderCompleted: 1,
      isAvailable: 1,
      contact: 1,
      address: 1,
    }
  )
    .sort(sortConditions) // Apply sorting
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Vendor.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      totalPage: Math.ceil(total / limit),
      total: total,
    },
    data: vendors,
  };
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

    mapDataToIntervals(intervals, orders, 'count');

    return intervals;
  } catch (error) {
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
      const { totalOrders, completedOrders } = interval;
      interval.value =
        totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    });

    return intervals;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to calculate customer retention'
    );
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
  getBusinessInformationFromVendor,
};
