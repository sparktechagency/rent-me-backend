import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { INotification } from './notification.interface';
import { NotificationService } from './notification.service';
import { Request, Response } from 'express';

const createNotification = catchAsync(async (req: Request, res: Response) => {
  const { ...notificationData } = req.body;
  const result = await NotificationService.storeNotificationToDB(
    notificationData
  );
  sendResponse<INotification>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification created successfully',
    data: result,
  });
});

export const NotificationController = {
  createNotification,
};
