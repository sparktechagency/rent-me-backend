import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';

const storeNotificationToDB = async (
  data: INotification
): Promise<INotification> => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification'
    );
  }
  return result;
};

export const NotificationService = {
  storeNotificationToDB,
};
