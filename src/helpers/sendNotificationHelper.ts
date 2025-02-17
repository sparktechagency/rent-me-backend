import { Types } from 'mongoose';
import { Notification } from '../app/modules/notification/notification.model';
import ApiError from '../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { sendPushNotification } from './pushNotificationHelper';
import { INotification } from '../app/modules/notification/notification.interface';


export const sendNotification = async (
  namespace: string,
  recipient: Types.ObjectId | string,
  data: INotification,
  pushNotificationData?: {
    deviceId: string;
    destination: string;
    role: string;
    id?: string;
    icon?: string;
    title?: string;
    message?: string;
  },
) => {
  const result = await Notification.create(data);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create notification',
    );
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const socket = global.io;

  if (pushNotificationData) {
    const { title, message, role, destination, id, icon, deviceId } = pushNotificationData;
    await sendPushNotification(
      deviceId,
      title ? title : data.title,
      message ? message : data.message,
      {
        role: role,
        destination: destination,
        id: new Types.ObjectId(id).toString(),
      },
      icon
    );
  }

  socket.emit(`${namespace}::${recipient}`, result);

}


  export const sendDataWithSocket = async (
  namespace: string,
  recipient: string | Types.ObjectId,
  data: Record<string, unknown>
) => {
  //@ts-expect-error globalThis
  const socket = global.io;

  socket.emit(`${namespace}::${recipient}`, data);
};
