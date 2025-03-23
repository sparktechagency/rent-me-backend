import { model, Schema } from 'mongoose';
import { ChatModel, IChat } from './chat.interface';

const chatSchema = new Schema<IChat, ChatModel>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    latestMessage: { type: String },
    latestMessageTime: { type: Date, default: new Date() },
  },

  {
    timestamps: true,
  }
);

export const Chat = model<IChat, ChatModel>('Chat', chatSchema);
