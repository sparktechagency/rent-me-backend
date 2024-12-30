import { Request, Response } from 'express';
import { orderFilterableFields } from './dashboard.constants';
import { IRange } from './dashboard.interface';
import catchAsync from '../../../shared/catchAsync';
import { DashboardService } from './dashboard.service';
import sendResponse from '../../../shared/sendResponse';
import pick from '../../../shared/pick';
import { Types } from 'mongoose';

const generalStatForAdminDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DashboardService.generalStatForAdminDashboard();

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Dashboard data retrieved successfully',
      data: result,
    });
  }
);

const totalSaleAndRevenue = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.totalSaleAndRevenue();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const filtersData = pick(req.query, orderFilterableFields);
  const result = await DashboardService.getAllOrders(filtersData);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const getVendorsOrderConversionRate = catchAsync(
  async (req: Request, res: Response) => {
    const range = req.query.range as IRange;
    const result = await DashboardService.getVendorsOrderConversionRate(range);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Dashboard data retrieved successfully',
      data: result,
    });
  }
);

const getOrdersProgress = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getOrdersProgress();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Order progress retrieved successfully',
    data: result,
  });
});

const getUserEngagement = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getUserEngagement();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User engagement retrieved successfully',
    data: result,
  });
});

const getUserActivityTrend = catchAsync(async (req: Request, res: Response) => {
  const range = req.query.range as IRange;
  const result = await DashboardService.getUserActivityTrend(range);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User service taking rate retrieved successfully',
    data: result,
  });
});

const getBestServices = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getBestServices();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Best services retrieved successfully',
    data: result,
  });
});

const getOrderRetentionRate = catchAsync(
  async (req: Request, res: Response) => {
    const range = req.query.range as IRange;
    const result = await DashboardService.getOrderRetentionRate(range);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Order retention rate retrieved successfully',
      data: result,
    });
  }
);

const getCustomerRetentionData = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DashboardService.getCustomerRetentionData();
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Customer retention data retrieved successfully',
      data: result,
    });
  }
);

const getRevenue = catchAsync(async (req: Request, res: Response) => {
  const range = req.query.range as IRange;
  const result = await DashboardService.getRevenue(range);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Revenue data retrieved successfully',
    data: result,
  });
});

const getYearlyActivityData = catchAsync(
  async (req: Request, res: Response) => {
    const { range } = req.query;
    const result = await DashboardService.getYearlyActivityData(Number(range));
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Over all stat retrieved successfully',
      data: result,
    });
  }
);

const restrictOrActivateUserAccount = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DashboardService.restrictOrActivateUserAccount(
      new Types.ObjectId(id)
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: result,
    });
  }
);

export const DashboardController = {
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
