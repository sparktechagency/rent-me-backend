import { Model, Types } from 'mongoose';


export type IChat = {
  participants: [Types.ObjectId ];
  latestMessage: string;
  latestMessageTime: Date;
};

export type ChatModel = Model<IChat>;
