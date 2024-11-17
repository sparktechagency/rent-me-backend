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
  const participant1 = new Types.ObjectId(user.id);

  const queryCondition =
    user.role === USER_ROLES.CUSTOMER
      ? { vendor: new Types.ObjectId(payload.participantId) }
      : { customer: new Types.ObjectId(payload.participantId) };

  // Run both the user existence check and the chat existence check concurrently
  const [isUserExist, isChatExist] = await Promise.all([
    User.findOne(queryCondition), // Check if the user exists
    Chat.findOne({
      participants: {
        $all: [participant1, new Types.ObjectId(payload.participantId)],
      },
    }) // Check if the chat exists
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
      .lean(),
  ]);

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const participantIds =
    user.role === USER_ROLES.CUSTOMER
      ? [participant1, isUserExist._id]
      : [isUserExist._id, participant1]; // vendor at index 1

  if (isChatExist) return isChatExist;

  // Create new chat if no existing chat
  const result = await Chat.create({ participants: participantIds });
  return result;
};

const getChatListByUserId = async (user: JwtPayload) => {
  const chat = await Chat.find({
    participants: { $in: [user.id] },
  })
    .populate({
      path: 'participants',
      select: { vendor: 1, customer: 1 },
      populate: [
        { path: 'customer', select: 'name email' },
        { path: 'vendor', select: 'name email' },
      ],
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
