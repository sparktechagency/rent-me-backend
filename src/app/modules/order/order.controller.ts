import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { OrderService } from './order.service';
import pick from '../../../shared/pick';
import { orderFilterableFields } from './order.constant';
import { paginationFields } from '../../../types/pagination';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const { ...orderData } = req.body;
  const { userId } = req.user;
  orderData.customerId = userId; // assigning customer id to order
  const result = await OrderService.createOrder(orderData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order placed successfully',
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const filterData = pick(req.query, orderFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await OrderService.getAllOrders(filterData, paginationFields);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All orders retrieved successfully',
    data: result,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OrderService.getSingleOrder(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order retrieved successfully',
    data: result,
  });
});

const getAllOrderByUserId = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const filterData = pick(req.query, ['status', 'serviceDate']);
  const result = await OrderService.getAllOrderByUserId(user, filterData);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All orders retrieved successfully',
    data: result,
  });
});

//customer
const declineOrConfirmOrder = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { ...updatedData } = req.body;
    const result = await OrderService.declineOrConfirmOrder(id, updatedData);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Order updated successfully',
      data: result,
    });
  }
);

const rejectOrAcceptOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...updatedData } = req.body;
  const result = await OrderService.rejectOrAcceptOrder(id, updatedData);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Order updated successfully',
    data: result,
  });
});
export const OrderController = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getAllOrderByUserId,
  declineOrConfirmOrder,
  rejectOrAcceptOrder,
};
