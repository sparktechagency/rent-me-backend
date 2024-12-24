/* eslint-disable no-undef */
import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';
import { Message } from './message.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

const sendMessage = async (user: JwtPayload, payload: IMessage) => {
  const senderId = new Types.ObjectId(user.id);

  const [chat, receiver] = await Promise.all([
    Chat.findById(payload.chatId),
    User.findOne({
      [user.role === USER_ROLES.CUSTOMER ? 'vendor' : 'customer']:
        payload.receiver,
    }),
  ]);

  // Check if chat exists
  if (!chat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exist.');
  }

  // Check if receiver exists
  if (!receiver) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');
  }

  // Determine message type
  payload.sender = senderId;
  payload.receiver = receiver._id;
  payload.type =
    payload.image && payload.message
      ? 'both'
      : payload.image
      ? 'image'
      : 'text';

  // Create the message
  const result = await Message.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }

  // Populate the message with sender and receiver details
  const populatedResult = await Message.findById(result._id)
    .populate({
      path: 'sender',
      select: { name: 1 },

      populate: {
        path: 'customer vendor',
        select: { name: 1, profileImg: 1 },
      },
    })
    .populate({
      path: 'receiver',
      select: { name: 1 },

      populate: {
        path: 'customer vendor',
        select: { name: 1, profileImg: 1 },
      },
    });

  // Update the chat with latest message details
  const chatUpdate = await Chat.findOneAndUpdate(
    { _id: payload.chatId },
    { latestMessage: result._id, latestMessageTime: new Date() },
    { new: true }
  );
  // Emit message to socket
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.io?.emit(`messageReceived::${payload.chatId}`, populatedResult);

  if (!chatUpdate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update chat.');
  }

  return populatedResult;
};

const getMessagesByChatId = async (
  chatId: string,
  paginationOptions: IPaginationOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);
  const result = await Message.find({ chatId })
    .populate({
      path: 'sender',
      select: { name: 1 },
      populate: {
        path: 'customer vendor',
        select: { name: 1, profileImg: 1 },
      },
    })
    .populate({
      path: 'receiver',
      select: { name: 1 },

      populate: {
        path: 'customer vendor',
        select: { name: 1, profileImg: 1 },
      },
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get messages.');
  }
  const total = await Message.countDocuments({ chatId });
  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

export const MessageService = {
  sendMessage,
  getMessagesByChatId,
};
