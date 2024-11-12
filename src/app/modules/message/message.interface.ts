import { Model, Types } from 'mongoose';
import { IChat } from '../chat/chat.interface';

export type IMessage = {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  message: string;
  isRead: boolean;
  chatId: Types.ObjectId | IChat;
  image: string;
};

export type MessageModel = Model<IChat>;
