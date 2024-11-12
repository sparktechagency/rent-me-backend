import { JwtPayload } from 'jsonwebtoken';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { Types } from 'mongoose';

const accessChat = async (
  user: JwtPayload,
  payload: { participantId: string }
) => {
  console.log(payload);

  const participant1 = new Types.ObjectId(user.id);

  const queryCondition =
    user.role === USER_ROLES.CUSTOMER
      ? { vendor: payload.participantId }
      : { customer: payload.participantId };

  const isUserExist = await User.findOne(queryCondition);

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const participantIds = [participant1, isUserExist?._id];

  const isChatExist = await Chat.findOne({
    participants: { $all: [...participantIds] },
  })
    .populate({
      path: 'participants',
      select: { vendor: 1, customer: 1 },
      populate: [
        { path: 'customer', select: 'name email' },
        { path: 'vendor', select: 'name email' },
      ],
    })
    .populate({
      path: 'latestMessage',
      select: { message: 1, image: 1 },
    })
    .lean();
  if (isChatExist) return isChatExist;

  const result = await Chat.create({ participants: participantIds });
  return result;
};

const getChatListByUserId = async (user: JwtPayload) => {
  const chat = await Chat.find({
    participants: { $in: [user.id] },
  })
    .populate({
      path: 'participants',
    })
    .lean();
  if (!chat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get chat list');
  }

  return chat;
};

export const ChatService = {
  accessChat,
  getChatListByUserId,
};
