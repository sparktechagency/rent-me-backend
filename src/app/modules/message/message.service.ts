import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';
import { Message } from './message.model';

const sendMessage = async (user: JwtPayload, payload: IMessage) => {
  const senderId = new Types.ObjectId(user.id);
  const chat = await Chat.findById(payload.chatId);

  if (!chat)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exist.');

  const receiver = await User.findOne({
    [user.role === USER_ROLES.CUSTOMER ? 'vendor' : 'customer']:
      payload.receiverId,
  });

  if (!receiver) throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');

  // Determine message type
  payload.senderId = senderId;
  payload.receiverId = receiver._id;
  payload.type =
    payload.image && payload.message
      ? 'both'
      : payload.image
      ? 'image'
      : 'text';

  const result = await Message.create(payload);
  if (!result)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');

  const populatedResult = await (
    await result.populate('senderId', { name: 1, email: 1 })
  ).populate('receiverId', { name: 1, email: 1 });

  // @ts-ignore
  global.io?.emit(`messageReceived::${payload.chatId}`, populatedResult);

  await Chat.findByIdAndUpdate(
    payload.chatId,
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true }
  );

  return result;
};

const getMessagesByChatId = async (chatId: string) => {
  const result = await Message.find({ chatId })
    .populate({
      path: 'senderId',
      select: 'email',
      populate: {
        path: 'customer vendor',
        select: 'name',
      },
    })
    .populate({
      path: 'receiverId',
      select: 'email',
      populate: {
        path: 'customer vendor',
        select: 'name',
      },
    });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get messages.');
  }
  return result;
};

export const MessageService = {
  sendMessage,
  getMessagesByChatId,
};
