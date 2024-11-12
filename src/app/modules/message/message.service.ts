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
  const senderId = user.id;

  const isChatExist = await Chat.findById(payload.chatId);

  if (!isChatExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exists.');
  }
  const queryCondition =
    user.role === USER_ROLES.CUSTOMER
      ? { vendor: payload.receiverId }
      : { customer: payload.receiverId };

  const isUserExist = await User.findOne(queryCondition);

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found!');
  }

  payload.senderId = new Types.ObjectId(senderId);
  payload.receiverId = isUserExist._id;

  const result = await Message.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    payload.chatId,
    {
      latestMessage: result._id, // Set the latest message ID
      latestMessageTime: new Date(), // Set the current timestamp
    },
    { new: true } // Return the updated chat document
  );

  if (!updatedChat) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to update chat with latest message.'
    );
  }

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
        path: 'customer vendor', // populate customer or vendor based on the role
        select: 'name', // select only the name field in customer or vendor
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
