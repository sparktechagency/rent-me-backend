import { Types } from 'mongoose';
import { Notification } from '../app/modules/notification/notification.model';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

import { INotification } from '../app/modules/notification/notification.interface';

export const sendNotification = async (
  namespace: string,
  recipient: Types.ObjectId | string,
  data: INotification,
  path?: string
) => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification'
    );
  }
  //@ts-expect-error globalThis
  const socket = global.io;

  socket.emit(`${namespace}::${recipient}`, data, path);
};

export const sendDataWithSocket = async (
  namespace: string,
  recipient: string | Types.ObjectId,
  data: Record<string, unknown>
) => {
  //@ts-expect-error globalThis
  const socket = global.io;

  socket.emit(`${namespace}::${recipient}`, data);
};
