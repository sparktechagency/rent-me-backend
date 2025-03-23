import { JwtPayload } from 'jsonwebtoken';
import { IMessage } from './message.interface';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';
import { Message } from './message.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { USER_ROLES } from '../../../enums/user';
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { logger } from '../../../shared/logger';


type PopulatedParticipant = {
  _id: Types.ObjectId;
  customer?: { name: string; profileImg: string, deviceId: string, _id: Types.ObjectId };
  vendor?: { name: string; profileImg: string, deviceId: string, _id: Types.ObjectId };
}

type PopulatedChat = {
  _id: Types.ObjectId;
  participants: PopulatedParticipant[];
  latestMessageTime?: Date;
}


const sendMessage = async (user: JwtPayload, payload: IMessage) => {
  const senderId = new Types.ObjectId(user.id);

  // Fetch the chat with populated participants
  const chat = await Chat.findById(payload.chatId).populate({
    path: 'participants',
    select: { vendor: 1, customer: 1 },
    populate: [
      { path: 'customer', select: 'name profileImg deviceId' },
      { path: 'vendor', select: 'name profileImg deviceId' },
    ],
  }).lean() as PopulatedChat | null;

  if (!chat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chat does not exist.');
  }

  // Determine the receiver and message type
  const receiver = chat.participants.find(
    (participant) => participant._id.toString() !== senderId.toString()
  );

  if (!receiver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found in chat.');
  }

  payload.sender = senderId;
  payload.receiver = receiver._id;
  payload.type = payload.image && payload.message ? 'both' : payload.image ? 'image' : 'text';

  // Create the message
  const message = await Message.create(payload);
  if (!message) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to send message.');
  }

  // Populate the message with sender and receiver details
  const populatedMessage = await Message.findById(message._id)
    .populate<{ sender: PopulatedParticipant; }>({
      path: 'sender',
      select: 'name',
      populate: [
        { path: 'customer', select: 'name profileImg _id deviceId' },
        { path: 'vendor', select: 'name profileImg _id deviceId' },
      ],
    })
    .populate<{ receiver: PopulatedParticipant }>({
      path: 'receiver',
      select: 'name',
      populate: [
        { path: 'customer', select: 'name profileImg _id deviceId' },
        { path: 'vendor', select: 'name profileImg _id deviceId' },
      ],
    })
    .lean();

  // Update the chat with the latest message details
  const updatedChat = await Chat.findOneAndUpdate(
    { _id: payload.chatId },
    { $set: {latestMessage: payload.message, latestMessageTime: new Date()} },
    { new: true }
  ).lean();

  if (!updatedChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update chat.');
  }

  // Prepare socket data
  // const socketChatListData = {
  //   chatId: chat._id,
  //   name: receiver.customer?.name || receiver.vendor?.name,
  //   profileImg: receiver.customer?.profileImg || receiver.vendor?.profileImg || '',
  //   latestMessage: updatedChat.latestMessage,
  //   latestMessageTime: updatedChat.latestMessageTime,
  // };

  const senderName = user.role === USER_ROLES.CUSTOMER
    ? populatedMessage?.sender?.customer?.name
    : populatedMessage?.sender?.vendor?.name;


    const timeBetweenLastMessage = new Date().getTime() - updatedChat.latestMessageTime.getTime();

    if(timeBetweenLastMessage > 21600000) {

      try {
        await sendNotification(
          'getNotification',
          (receiver.customer?._id || receiver.vendor?._id) as Types.ObjectId,
          {
            title: `New message from ${senderName }`,
            message: payload.message,
            userId: receiver.customer?._id || receiver.vendor?._id as Types.ObjectId,
            type: receiver.customer ? USER_ROLES.CUSTOMER : USER_ROLES.VENDOR,
          },
          {
            deviceId: receiver.customer?.deviceId || receiver.vendor?.deviceId as string,
            role: receiver.customer ? USER_ROLES.CUSTOMER : USER_ROLES.VENDOR,
            destination: 'chat',
            id: chat._id.toString(),
          }
        );
      } catch (error) {
        logger.error('Error sending push notification:', error);
      }
    }
  // Emit socket events
  //@ts-expect-error socket
  global.io.emit(`messageReceived::${payload.chatId}`, populatedMessage);
  
  // global.io.emit(`newChat::${user.role === USER_ROLES.CUSTOMER ? receiver.customer : receiver.vendor}`, socketChatListData);

  return populatedMessage;
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
