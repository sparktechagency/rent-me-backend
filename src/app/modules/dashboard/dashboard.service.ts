/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { orderFilterableFields } from './dashboard.constants';
import { IRange } from './dashboard.interface';
import { Order } from '../order/order.model';
import ApiError from '../../../errors/ApiError';
import { Vendor } from '../vendor/vendor.model';
import { User } from '../user/user.model';
import { Service } from '../service/service.model';
import { IOrderFilterableFields } from '../order/order.interface';
import config from '../../../config';
import { Payment } from '../payment/payment.model';
import { Types } from 'mongoose';

const RANGE_MAPPING: Record<IRange, number> = {
  '1-week': 7,
  '1-month': 30,
  '3-months': 90,
  '6-months': 180,
  '1-year': 365,
  'all-time': 0, // Indicates no limit
};

const generalStatForAdminDashboard = async () => {
  try {
    const totalActiveUsers = await User.countDocuments({ status: 'active' });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newSignups = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    const totalActiveVendors = await User.countDocuments({
      role: 'VENDOR',
      status: { $ne: 'deleted' },
    });

    const totalCompletedOrders = await Order.countDocuments({
      status: 'completed',
    });

    const totalServices = await Service.countDocuments();

    // Return all stats
    return {
      totalActiveUsers,
      newSignups,
      totalActiveVendors,
      totalCompletedOrders,
      totalServices,
    };
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get stats');
  }
};

const totalSaleAndRevenue = async () => {
  try {
    const days = 7; // Fixed to 7 days

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Aggregation pipeline for payments
    const paymentPipeline = [
      {
        $match: {
          status: 'succeeded',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $addFields: {
          platformRevenue: {
            $cond: {
              if: { $eq: ['$isInstantTransfer', true] },
              then: {
                // Corrected to directly access the config value
                $multiply: ['$amount', Number(config.instant_transfer_fee)],
              },
              else: {
                // Corrected to directly access the config value
                $multiply: ['$amount', Number(config.application_fee)],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          totalSales: { $sum: '$amount' },
          totalRevenue: { $sum: '$platformRevenue' },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const paymentResult = await Payment.aggregate(paymentPipeline);

    // Initialize combined data for 7 days
    const combinedData: {
      [key: string]: { totalSales: number; totalRevenue: number };
    } = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const formattedDate = date.toISOString().split('T')[0];
      combinedData[formattedDate] = { totalSales: 0, totalRevenue: 0 };
    }

    // Populate results from payment aggregation
    paymentResult.forEach(({ _id, totalSales, totalRevenue }) => {
      if (combinedData[_id]) {
        combinedData[_id].totalSales += totalSales;
        combinedData[_id].totalRevenue += totalRevenue;
      }
    });

    // Format data for chart
    const aggregatedData = Object.keys(combinedData).map(date => ({
      date,
      totalSales: combinedData[date].totalSales,
      totalRevenue: parseFloat(combinedData[date].totalRevenue.toFixed(1)),
    }));

    return aggregatedData;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to fetch sales and revenue data'
    );
  }
};

// API to get sales and revenue data for charts (including setupFee and deliveryFee)

const getAllOrders = async (filtersData: IOrderFilterableFields) => {
  const andCondition: any[] = [];

  for (const [key, value] of Object.entries(filtersData)) {
    if (orderFilterableFields.includes(key) && value) {
      if (key === 'searchTerm') {
        andCondition.push({
          deliveryAddress: {
            $regex: value,
            $options: 'i',
          },
        });
      } else if (key === 'status' || key === 'paymentStatus') {
        andCondition.push({ [key]: value });
      } else if (
        key === 'serviceStartDateTime' ||
        key === 'serviceEndDateTime'
      ) {
        andCondition.push({
          [key]: { $gte: new Date(value) },
        });
      }
    }
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  try {
    const result = await Order.find(whereConditions)
      .populate('vendorId', { name: 1 })
      .populate('packageId')
      .populate('serviceId')
      .populate('customerId', { name: 1 });
    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No orders found matching the criteria'
      );
    }

    return result;
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get orders');
  }
};

const getVendorsOrderConversionRate = async (range: IRange = '1-week') => {
  const days = RANGE_MAPPING[range];
  const startDate =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  try {
    const pipeline: any[] = [
      // Join orders with vendors
      {
        $lookup: {
          from: 'orders', // Name of the Order collection
          localField: '_id', // `_id` in the Vendor collection
          foreignField: 'vendorId', // `vendorId` in the Order collection
          as: 'vendorOrders',
        },
      },

      // Filter orders by date range if applicable
      ...(startDate
        ? [
            {
              $addFields: {
                vendorOrders: {
                  $filter: {
                    input: '$vendorOrders',
                    as: 'order',
                    cond: { $gte: ['$$order.createdAt', startDate] },
                  },
                },
              },
            },
          ]
        : []),

      // Group by vendorId to calculate metrics
      {
        $project: {
          name: 1,
          profileImg: 1,
          totalOrders: { $size: '$vendorOrders' }, // Total orders for the vendor
          convertedOrders: {
            $size: {
              $filter: {
                input: '$vendorOrders',
                as: 'order',
                cond: {
                  $in: ['$$order.status', ['accepted', 'completed', 'ongoing']],
                },
              },
            },
          },
        },
      },

      // Calculate conversion rate
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$convertedOrders', '$totalOrders'] },
                  100,
                ],
              },
            ],
          },
        },
      },

      // Sort by conversion rate in descending order
      { $sort: { conversionRate: -1 } },
    ];

    const result = await Vendor.aggregate(pipeline); // Use the Vendor collection explicitly

    return result;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to calculate vendor conversion rates'
    );
  }
};

const getOrdersProgress = async () => {
  try {
    // Aggregation pipeline
    const pipeline: any[] = [
      // Group orders by status categories
      {
        $group: {
          _id: null, // Group all orders
          totalOrders: { $sum: 1 }, // Total count of all orders
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          inProgressOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['ongoing', 'accepted']] }, 1, 0],
            },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          declinedOrRejectedOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['declined', 'rejected']] }, 1, 0],
            },
          },
        },
      },

      // Add percentage calculations
      {
        $addFields: {
          completedPercentage: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$completedOrders', '$totalOrders'] },
                  100,
                ],
              },
            ],
          },
          inProgressPercentage: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$inProgressOrders', '$totalOrders'] },
                  100,
                ],
              },
            ],
          },
          pendingPercentage: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$pendingOrders', '$totalOrders'] },
                  100,
                ],
              },
            ],
          },
          declinedOrRejectedPercentage: {
            $cond: [
              { $eq: ['$totalOrders', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$declinedOrRejectedOrders', '$totalOrders'] },
                  100,
                ],
              },
            ],
          },
        },
      },

      // Select and rename the required fields
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          completedOrders: 1,
          completedPercentage: 1,
          inProgressOrders: 1,
          inProgressPercentage: 1,
          pendingOrders: 1,
          pendingPercentage: 1,
          declinedOrRejectedOrders: 1,
          declinedOrRejectedPercentage: 1,
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await Order.aggregate(pipeline).exec();

    // If no orders exist, return default values
    return (
      result[0] || {
        totalOrders: 0,
        completedOrders: 0,
        completedPercentage: 0,
        inProgressOrders: 0,
        inProgressPercentage: 0,
        pendingOrders: 0,
        pendingPercentage: 0,
        declinedOrRejectedOrders: 0,
        declinedOrRejectedPercentage: 0,
      }
    );
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to fetch orders progress'
    );
  }
};

const getUserEngagement = async (range: IRange = '1-week') => {
  const days = RANGE_MAPPING[range];
  const startDate =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  try {
    const pipeline: any[] = [
      // Optional date filter
      ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),

      // Group by date and calculate metrics
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          customerOrders: {
            $sum: {
              $cond: [{ $ne: ['$customerId', null] }, 1, 0], // Count orders placed by customers
            },
          },
          vendorActions: {
            $sum: {
              $cond: [
                {
                  $in: ['$status', ['accepted', 'completed', 'delivering']], // Vendor actions
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // Sort by date
      { $sort: { _id: 1 } },

      // Project final fields
      {
        $project: {
          date: '$_id',
          _id: 0,
          customerOrders: 1,
          vendorActions: 1,
          totalEngagement: { $add: ['$customerOrders', '$vendorActions'] }, // Sum both metrics
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    return result;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to calculate user engagement'
    );
  }
};

const getUserActivityTrend = async (range: IRange = '1-week') => {
  const days = RANGE_MAPPING[range]; // Get the number of days for the specified range
  const startDate =
    days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null; // Calculate the start date for the range

  try {
    // Initialize aggregation pipeline
    const pipeline: any[] = [
      // Step 1: Filter orders based on the specified date range
      ...(startDate ? [{ $match: { createdAt: { $gte: startDate } } }] : []),

      // Step 2: Group the orders by customerId and vendorId
      {
        $group: {
          _id: null, // We want to aggregate across all orders
          customerIds: { $addToSet: '$customerId' }, // Collect unique customer IDs
          vendorIds: { $addToSet: '$vendorId' }, // Collect unique vendor IDs
        },
      },

      // Step 3: Project the fields we need
      {
        $project: {
          customerCount: { $size: '$customerIds' }, // Count the unique customers
          vendorCount: { $size: '$vendorIds' }, // Count the unique vendors
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await Order.aggregate(pipeline);

    // Step 4: Calculate the service taken and service given rates
    const totalCustomers = 10; // Assume total customers count (or fetch from database)
    const totalVendors = 10; // Assume total vendors count (or fetch from database)

    const data = result[0]; // Get the aggregation result
    const customersWithOrders = data.customerCount;
    const vendorsWithOrders = data.vendorCount;

    const serviceTakenRateByCustomer =
      (customersWithOrders / totalCustomers) * 100;
    const serviceGivenRateByVendor = (vendorsWithOrders / totalVendors) * 100;

    // Step 5: Return the calculated rates
    return {
      serviceTakenRateByCustomer,
      serviceGivenRateByVendor,
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to calculate user activity trend'
    );
  }
};

const getBestServices = async () => {
  try {
    // MongoDB Aggregation Pipeline to get the top 3 services based on order count
    const pipeline: any[] = [
      // Step 1: Group orders by serviceId and count the number of orders
      {
        $group: {
          _id: '$serviceId', // Group by serviceId
          orderCount: { $sum: 1 }, // Count the number of orders for each service
        },
      },

      // Step 2: Sort the services by orderCount in descending order
      {
        $sort: { orderCount: -1 },
      },

      // Step 3: Limit the result to top 3 services
      {
        $limit: 3,
      },

      // Step 4: Optionally, join with the 'services' collection to get additional service details
      {
        $lookup: {
          from: 'services', // Name of the services collection
          localField: '_id', // serviceId in orders collection
          foreignField: '_id', // _id in services collection
          as: 'serviceDetails', // Output in 'serviceDetails' array
        },
      },

      // Step 5: Project the fields we want in the output (serviceId, orderCount, service details)
      {
        $project: {
          serviceId: '$_id',
          orderCount: 1,
          serviceName: { $arrayElemAt: ['$serviceDetails.title', 0] }, // Use $arrayElemAt to access the name directly
        },
      },

      // Step 6: Calculate the total number of orders directly in the pipeline
      {
        $facet: {
          services: [{ $skip: 0 }, { $limit: 3 }],
          totalOrders: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: '$orderCount' },
              },
            },
          ],
        },
      },

      // Step 7: Merge the results and calculate percentages in the final stage
      {
        $project: {
          services: 1,
          totalOrders: { $arrayElemAt: ['$totalOrders.totalOrders', 0] },
        },
      },

      // Step 8: Add percentage for each service based on total orders
      {
        $addFields: {
          services: {
            $map: {
              input: '$services',
              as: 'service',
              in: {
                $mergeObjects: [
                  '$$service',
                  {
                    orderPercentage: {
                      $cond: {
                        if: { $gt: ['$totalOrders', 0] },
                        then: {
                          $multiply: [
                            {
                              $divide: ['$$service.orderCount', '$totalOrders'],
                            },
                            100,
                          ],
                        },
                        else: 0,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // Step 9: Flatten the results (remove the facet structure)
      { $project: { services: 1 } },
    ];

    // Execute the aggregation pipeline to get the top 3 services and their order count
    const result = await Order.aggregate(pipeline);

    // Step 10: Return the final result
    return result[0]?.services || [];
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to fetch top services');
  }
};

const getOrderRetentionRate = async (range: IRange = '1-week') => {
  try {
    const days = RANGE_MAPPING[range];
    const startDate =
      days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    // Determine the interval for grouping
    const dateFormat =
      range === '1-year'
        ? '%Y-%m' // Group by year and month
        : '%Y-%m-%d'; // Group by year, month, and day for week or month

    // Match stage for filtering by date
    const matchStage = startDate ? { createdAt: { $gte: startDate } } : {};

    // MongoDB aggregation pipeline
    const pipeline: any[] = [
      // Step 1: Filter by date range
      { $match: matchStage },

      // Step 2: Add a formatted date field for grouping
      {
        $addFields: {
          formattedDate: {
            $dateToString: { format: dateFormat, date: '$createdAt' },
          },
        },
      },

      // Step 3: Group orders by the formatted date and status
      {
        $group: {
          _id: { date: '$formattedDate', status: '$status' },
          orderCount: { $sum: 1 },
        },
      },

      // Step 4: Reorganize data to group by date, calculating totals and retention counts
      {
        $group: {
          _id: '$_id.date', // Group by date
          totalOrders: { $sum: '$orderCount' }, // Total orders on that date
          retentionCount: {
            $sum: {
              $cond: [
                { $in: ['$_id.status', ['accepted', 'ongoing', 'completed']] },
                '$orderCount',
                0,
              ],
            },
          },
        },
      },

      // Step 5: Calculate the retention rate for each date
      {
        $addFields: {
          retentionRate: {
            $cond: {
              if: { $gt: ['$totalOrders', 0] },
              then: {
                $multiply: [
                  { $divide: ['$retentionCount', '$totalOrders'] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },

      // Step 6: Sort data points by date
      {
        $sort: { _id: 1 }, // Ascending order by date
      },

      // Step 7: Format the final output
      {
        $project: {
          date: '$_id',
          totalOrders: 1,
          retentionCount: 1,
          retentionRate: { $round: ['$retentionRate', 2] }, // Round to 2 decimals
          _id: 0,
        },
      },
    ];

    // Execute the pipeline
    const result = await Order.aggregate(pipeline);

    // Return the response
    return {
      success: true,
      message: 'Order retention rate retrieved successfully',
      data: result,
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to calculate order retention rate'
    );
  }
};

const getCustomerRetentionData = async () => {
  try {
    // MongoDB Aggregation Pipeline
    const pipeline: any[] = [
      // Step 1: Group orders by customerId and count the orders for each customer
      {
        $group: {
          _id: '$customerId', // Group by customerId
          orderCount: { $sum: 1 }, // Count the number of orders per customer
        },
      },

      // Step 2: Separate repeat customers (more than 1 order) and unique customers
      {
        $group: {
          _id: null, // Single document result
          totalCustomers: { $sum: 1 }, // Total number of customers
          repeatCustomers: {
            $sum: {
              $cond: [{ $gt: ['$orderCount', 1] }, 1, 0], // Count customers with more than 1 order
            },
          },
        },
      },

      // Step 3: Calculate the retention rate
      {
        $addFields: {
          retentionRate: {
            $cond: {
              if: { $gt: ['$totalCustomers', 0] },
              then: {
                $multiply: [
                  { $divide: ['$repeatCustomers', '$totalCustomers'] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },

      // Step 4: Project the desired fields
      {
        $project: {
          _id: 0,
          totalCustomers: 1,
          repeatCustomers: 1,
          retentionRate: { $round: ['$retentionRate', 2] }, // Retention rate rounded to 2 decimals
        },
      },
    ];

    // Execute the aggregation pipeline
    const result = await Order.aggregate(pipeline);

    // Return the formatted response
    return {
      success: true,
      message: 'Customer retention data retrieved successfully',
      data: result.length
        ? result[0]
        : { totalCustomers: 0, repeatCustomers: 0, retentionRate: 0 },
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to fetch customer retention data'
    );
  }
};

const getRevenue = async (range: IRange = '1-week') => {
  try {
    // Map the range to a number of days

    const days = RANGE_MAPPING[range];
    const startDate =
      days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    const pipeline: any[] = [
      // Step 1: Filter orders by createdAt date if a range is specified

      {
        $match: {
          status: 'completed',
          ...(startDate
            ? [{ $match: { createdAt: { $gte: startDate } } }]
            : []),
        },
      },

      // Step 2: Group revenue by day, week, month, or year
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                range === '1-week'
                  ? '%Y-%m-%d' // Daily data for weekly range
                  : range === '1-month'
                  ? '%Y-%U' // Weekly data for monthly range
                  : range === '1-year'
                  ? '%Y-%m' // Monthly data for yearly range
                  : '%Y-%m-%d', // Default format for daily
              date: '$createdAt',
            },
          },
          totalRevenue: { $sum: '$amount' }, // Sum revenue from orders
        },
      },

      // Step 3: Sort data chronologically
      { $sort: { _id: 1 } },

      // Step 4: Format the output
      {
        $project: {
          date: '$_id', // Date bucket
          totalRevenue: 1, // Total revenue
          _id: 0, // Remove internal ID
        },
      },
    ];

    // Execute the aggregation pipeline
    const revenueData = await Order.aggregate(pipeline);

    // Calculate the overall total revenue
    const overallRevenue = revenueData.reduce(
      (sum: number, item: { totalRevenue: number }) => sum + item.totalRevenue,
      0
    );

    // Return the response
    return {
      success: true,
      message: 'Revenue data retrieved successfully',
      data: {
        range,
        totalRevenue: overallRevenue,
        revenueByPeriod: revenueData,
      },
    };
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to retrieve revenue data'
    );
  }
};

const getYearlyActivityData = async (year: number) => {
  try {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1); // Start of the target year (Jan 1)
    const endDate = new Date(targetYear + 1, 0, 1); // Start of the next year (Jan 1)

    const [userStats, orderStats, revenueStats] = await Promise.all([
      // Fetch user creation stats grouped by month
      User.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $month: '$createdAt' }, // Group by month (1-12)
            userCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Fetch order stats grouped by month
      Payment.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $month: '$createdAt' }, // Group by month (1-12)
            paymentCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Fetch revenue stats grouped by month
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lt: endDate },
            status: 'succeeded',
          },
        },
        {
          $group: {
            _id: { $month: '$createdAt' }, // Group by month (1-12)
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Map the months to their names
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Combine results into a single array
    const yearlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1; // MongoDB $month returns 1-12
      return {
        month: monthNames[i],
        orderCount:
          orderStats.find((stat: { _id: number }) => stat._id === month)
            ?.orderCount || 0,
        userCount:
          userStats.find((stat: { _id: number }) => stat._id === month)
            ?.userCount || 0,
        revenue:
          revenueStats.find((stat: { _id: number }) => stat._id === month)
            ?.revenue || 0,
      };
    });

    return yearlyData;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to retrieve yearly activity data'
    );
  }
};

const restrictOrActivateUserAccount = async (id: Types.ObjectId) => {
  const user = await User.findOne({ _id: id });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  let status = null;
  if (user.status === 'active') {
    await User.findByIdAndUpdate(id, {
      status: 'restricted',
    });
    status = 'restricted';
  } else {
    await User.findByIdAndUpdate(id, {
      status: 'active',
    });
    status = 'active';
  }

  return `User status updated to ${status}`;
};

export const DashboardService = {
  generalStatForAdminDashboard,
  totalSaleAndRevenue,
  getAllOrders,
  getVendorsOrderConversionRate,
  getOrdersProgress,
  getUserEngagement,
  getUserActivityTrend,
  getBestServices,
  getOrderRetentionRate,
  getCustomerRetentionData,
  getRevenue,
  getYearlyActivityData,
  restrictOrActivateUserAccount,
};
