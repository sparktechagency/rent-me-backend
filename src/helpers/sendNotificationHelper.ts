/* eslint-disable no-undef */
import { Types } from 'mongoose';
import { Notification } from '../app/modules/notification/notification.model';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

import { INotification } from '../app/modules/notification/notification.interface';

export const sendNotification = async (
  namespace: string,
  recipient: Types.ObjectId,
  data: INotification
) => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification'
    );
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const socket = global.io;

  socket.emit(`${namespace}::${recipient}`, data);
};
