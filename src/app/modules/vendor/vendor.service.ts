import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Vendor } from './vendor.model';
import { IVendor, IVendorFilterableFields } from './vendor.interface';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import { userSearchableFields } from '../user/user.constants';
import { Types } from 'mongoose';
import {
  buildDateTimeFilter,
  buildRangeFilter,
  calculateProfileCompletion,
  findVendorsByBudget,
  getDateRangeAndIntervals,
  handleObjectUpdate,
  mapDataToIntervals,
} from './vendor.utils';
import { Service } from '../service/service.model';
import { Order } from '../order/order.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { parse } from 'date-fns';
import { calculateDistance } from '../order/order.utils';
import { Bookmark } from '../bookmark/bookmark.model';
import { Customer } from '../customer/customer.model';
import { Product } from '../product/product.model';

const updateVendorProfile = async (
  user: JwtPayload,
  payload: Partial<IVendor>
) => {
  const { id, userId } = user;
  const { address, ...restData } = payload;

  // Fetch user and associated vendor in a single query
  const userWithVendor = await User.findById(id).populate<{ vendor: IVendor }>('vendor');

  if (!userWithVendor || !userWithVendor.vendor) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User or vendor doesn't exist!");
  }

  let updatedVendorData = { ...restData };

  // Handle nested address updates dynamically
  if (address && Object.keys(address).length > 0) {
    updatedVendorData = handleObjectUpdate(address, updatedVendorData, 'address');
  }

  // Preserve essential fields to prevent resetting
  Object.assign(updatedVendorData, {
    isBusinessContactVerified: userWithVendor.vendor.isBusinessContactVerified,
    isBusinessEmailVerified: userWithVendor.vendor.isBusinessEmailVerified,
    stripeId: userWithVendor.vendor.stripeId,
    stripeConnected: userWithVendor.vendor.stripeConnected,
  });

  // Perform the update and return the updated vendor document
  const vendor = await Vendor.findByIdAndUpdate(
    userId,
    { $set: updatedVendorData },
    { new: true }
  );

  if (!vendor) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
  }

  // Update profile completion
  const profileCompletion = calculateProfileCompletion(vendor);
  await Vendor.findByIdAndUpdate(userId, {
    $set: { profileCompletion, verifiedFlag: profileCompletion === 100 },
  });

  return vendor;
};


const getBusinessInformationFromVendor = async (
  user: JwtPayload,
  payload: Partial<IVendor>
) => {
  const { userId } = user;

  // Fetch the existing vendor once
  const existingVendor = await Vendor.findById(userId);
  if (!existingVendor) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Vendor doesn't exist!");
  }

  const { businessAddress, socialLinks, ...restData } = payload;
  let updatedVendorData = { ...restData };

  // Update business address and social links dynamically
  if (businessAddress && Object.keys(businessAddress).length > 0) {
    updatedVendorData = handleObjectUpdate(businessAddress, updatedVendorData, 'businessAddress');
  }

  if (socialLinks && Object.keys(socialLinks).length > 0) {
    updatedVendorData = handleObjectUpdate(socialLinks, updatedVendorData, 'socialLinks');
  }

  // Preserve essential fields
  Object.assign(updatedVendorData, {
    isBusinessContactVerified: existingVendor.isBusinessContactVerified,
    isBusinessEmailVerified: existingVendor.isBusinessEmailVerified,
    stripeId: existingVendor.stripeId,
    stripeConnected: existingVendor.stripeConnected,
  });

  // Perform update if any changes exist
  if (Object.keys(updatedVendorData).length > 0) {
    const vendor = await Vendor.findByIdAndUpdate(
      userId,
      { $set: updatedVendorData },
      { new: true }
    );

    if (!vendor) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
    }

    // Update profile completion
    const profileCompletion = calculateProfileCompletion(vendor);
    await Vendor.findByIdAndUpdate(userId, {
      $set: { profileCompletion, verifiedFlag: profileCompletion === 100 },
    });

    return vendor;
  }

  return existingVendor; // Return current vendor if no updates were needed
};


const getVendorProfile = async (user: JwtPayload) => {
  const { userId } = user;
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

const getSingleVendor = async (id: Types.ObjectId) => {
  const vendor = await Vendor.findById(id, {
    _id: 1,
    verifiedFlag: 1,
    profileCompletion: 1,
    businessAddress: 1,
    socialLinks: 1,
    rating: 1,
    totalReviews: 1,
    location: 1,
    orderCompleted: 1,
    profileImg: 1,
    businessTitle: 1,
    availableDays: 1,
    description: 1,
    yearsInBusiness: 1,
    businessContact: 1,
    businessEmail: 1,
    businessType: 1,
    operationStartTime: 1,
    operationEndTime: 1,
  });

  if (!vendor) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested vendor account is not active or does not exist.'
    );
  }
  return vendor;
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
  paginationOptions: IPaginationOptions,
  user: JwtPayload
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
    category,
    customerLat,
    customerLng,
    radius,
    ...filterData
  } = filters;

  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);

  const andCondition = [];

  if (searchTerm) {
    // Search vendor fields
    const vendorSearchCondition = {
      $or: userSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    };

    // Search product names
    const productVendorIds = await Product.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      'vendor'
    ).distinct('vendor');

    // Combine both conditions
    andCondition.push({
      $or: [
        vendorSearchCondition,
        { _id: { $in: productVendorIds } }, // Match vendors who have products with matching names
      ],
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  if (category) {
    const servicesWithCategory = await Service.find(
      { categoryId: category },
      { vendorId: 1 }
    ).distinct('vendorId');

    {
      andCondition.push({
        _id: { $in: servicesWithCategory },
      });
    }
  }

  if (serviceDate) {
    const requestedDay = parse(
      serviceDate,
      'dd-MM-yyyy',
      new Date()
    ).toLocaleDateString('en-US', { weekday: 'long' });

    andCondition.push({
      availableDays: { $in: [requestedDay] },
    });

    if (serviceTime) {
      const busyVendorIds = await buildDateTimeFilter(serviceDate, serviceTime);
      andCondition.push({
        _id: { $nin: busyVendorIds },
      });
    }
  }
  // Budget range filtering based on service data
  if (minBudget !== undefined || maxBudget !== undefined) {
    const budgetVendorIds = await findVendorsByBudget(minBudget, maxBudget);

    andCondition.push({
      _id: { $in: budgetVendorIds },
    });
  }

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
            [Number(customerLng), Number(customerLat)], // [lng, lat] format for GeoJSON
            radius / 3959, // Radius in radians (6378.1 is Earth's radius in kilometers)
          ],
        },
      },
    });
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const activeUserVendors = await User.find(
    { status: 'active' },
    'vendor' // Only select the `vendor` field
  ).lean();

  const activeVendorIds = activeUserVendors.map(user => user.vendor);

  // Get requested customer from the customer collection
  const requestedCustomer = await Customer.findById(user.userId, {
    location: 1,
  }).lean();

  if (!requestedCustomer) {
    throw new Error('Customer not found');
  }

  const { location: customerLocation } = requestedCustomer;

  // Get bookmarked vendors for the requested customer
  const bookmarkedVendorIds = await Bookmark.find(
    { customerId: user.userId, vendorId: { $in: activeVendorIds } },
    'vendorId'
  ).distinct('vendorId');

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
      profileImg: 1,
      location: 1,
      verifiedFlag: 1,
      businessAddress: 1,
      availableDays: 1,
      description: 1,
      yearsInBusiness: 1,
      businessContact: 1,
      businessEmail: 1,
      businessType: 1,
      operationStartTime: 1,
      operationEndTime: 1,
    }
  )
    .sort(
      sortBy || sortOrder
        ? {
            [sortBy]: sortOrder,
          }
        : {}
    ) // Apply sorting
    .skip(skip)
    .limit(limit)
    .lean();

  // Calculate distance and check bookmarks for each vendor
  const enrichedVendors = vendors.map(vendor => {
    const distance = calculateDistance(
      [customerLocation.coordinates[1], customerLocation.coordinates[0]],
      [vendor.location.coordinates[1], vendor.location.coordinates[0]]
    );

    return {
      ...vendor,
      distance,
      isBookmarked: bookmarkedVendorIds
        .map(id => id.toString())
        .includes(vendor._id.toString()),
    };
  });

  const total = await Vendor.countDocuments({
    ...whereConditions,

    _id: { $in: activeVendorIds }, // Filter by vendor IDs
  });

  return {
    meta: {
      page,
      limit,
      totalPage: Math.ceil(total / limit),
      total: total,
    },
    data: enrichedVendors,
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
          deliveryDateTime: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          amount: 1,
          intervalStart: {
            $floor: {
              $divide: [
                { $subtract: ['$deliveryDateTime', startDate] },
                intervalMilliseconds,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: '$intervalStart',
          totalRevenue: { $sum: '$amount' },
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

export const getOrderRetentionByVendor = async (
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
  getOrderRetentionByVendor,
  getBusinessInformationFromVendor,
};
