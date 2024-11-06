import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export const Notification = model<INotification, NotificationModel>(
  'Review',
  notificationSchema
);
