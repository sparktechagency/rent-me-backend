import { JwtPayload } from 'jsonwebtoken';
import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

// Define types and interfaces
type AccessChatPayload = {
  participantId: string;
}

type PopulatedParticipant = {
  _id: Types.ObjectId;
  customer?: { name: string; profileImg: string };
  vendor?: { name: string; profileImg: string };
}

type PopulatedChat = {
  _id: Types.ObjectId;
  participants: PopulatedParticipant[];
  latestMessageTime?: Date;
}

type FilteredChat = {
  _id: Types.ObjectId;
  participants: PopulatedParticipant[];
  latestMessageTime?: Date;
}

type ChatResult = {
  chatId: Types.ObjectId;
  name?: string;
  profileImg?: string;
  latestMessageTime?: Date;
}

type PaginatedChatResult = {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: ChatResult[];
}

// Access Chat Function
const accessChat = async (
  user: JwtPayload,
  payload: AccessChatPayload
): Promise<ChatResult> => {
  const participantId = new Types.ObjectId(payload.participantId);
  const getRequestUserAuthId = new Types.ObjectId(user.id);

  const query =
    user.role === USER_ROLES.CUSTOMER
      ? { vendor: participantId, status: 'active' }
      : { customer: participantId, status: 'active' };

  const [isRequestedUserExists, isParticipantExists] = await Promise.all([
    User.findById({ _id: getRequestUserAuthId, status: 'active' }),
    User.findOne(query),
  ]);

  if (!isRequestedUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not a valid user!');
  }

  if (!isParticipantExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const isChatExists = await Chat.findOne({
    participants: {
      $all: [getRequestUserAuthId, isParticipantExists._id],
    },
  }).populate({
    path: 'participants',
    select: { vendor: 1, customer: 1 },
    populate: [
      { path: 'customer', select: 'name profileImg' },
      { path: 'vendor', select: 'name profileImg' },
    ],
  }) as PopulatedChat | null;

  if (isChatExists) {
    const result = isChatExists.participants.find(
      participant => participant._id.toString() !== user.id
    );

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found in chat.');
    }

    return {
      chatId: isChatExists._id,
      name: result.customer?.name || result.vendor?.name,
      profileImg: result.customer?.profileImg || result.vendor?.profileImg,
      latestMessageTime: isChatExists.latestMessageTime,
    };
  }

  await Chat.create({
    participants: [getRequestUserAuthId, isParticipantExists._id],
  });

  const newChat = await Chat.findOne({
    participants: {
      $all: [getRequestUserAuthId, isParticipantExists._id],
    },
  }).populate({
    path: 'participants',
    select: { vendor: 1, customer: 1 },
    populate: [
      { path: 'customer', select: 'name profileImg' },
      { path: 'vendor', select: 'name profileImg' },
    ],
  }) as PopulatedChat | null;

  if (!newChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create chat.');
  }

  const participantData = newChat.participants.find(
    participant => participant._id.toString() !== user.id
  );

  if (!participantData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found in chat.');
  }

  return {
    chatId: newChat._id,
    name: participantData.customer?.name || participantData.vendor?.name,
    profileImg: participantData.customer?.profileImg || participantData.vendor?.profileImg,
    latestMessageTime: newChat.latestMessageTime,
  };
};

// Get Chat List by User ID Function
const getChatListByUserId = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
  searchTerm?: string
): Promise<PaginatedChatResult> => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const baseQuery = {
    participants: { $in: [user.id] },
  };

  const chats = await Chat.find(baseQuery)
    .populate<{ participants: PopulatedParticipant[] }>({
      path: 'participants',
      select: 'vendor customer',
      populate: [
        { path: 'customer', select: 'name profileImg' },
        { path: 'vendor', select: 'name profileImg' },
      ],
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  if (!chats) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get chat list');
  }

  const filteredChats = chats.filter(chat =>
    searchTerm
      ? chat.participants.some(
          participant =>
            participant.customer?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            participant.vendor?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        )
      : true
  ) as FilteredChat[];

  const total = await Chat.find(baseQuery)
    .populate<{ participants: PopulatedParticipant[] }>({
      path: 'participants',
      select: 'vendor customer',
      populate: [
        { path: 'customer', select: 'name' },
        { path: 'vendor', select: 'name' },
      ],
    })
    .lean()
    .then(
      allChats =>
        allChats.filter(chat =>
          searchTerm
            ? chat.participants.some(
                participant =>
                  participant.customer?.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  participant.vendor?.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
              )
            : true
        ).length
    );

  const result = filteredChats.map(chat => {
    const otherParticipant = chat.participants.find(
      participant => participant._id.toString() !== user.id
    );

    if (!otherParticipant) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Participant not found in chat.');
    }

    return {
      chatId: chat._id,
      name: otherParticipant.customer?.name || otherParticipant.vendor?.name,
      profileImg: otherParticipant.customer?.profileImg || otherParticipant.vendor?.profileImg,
      latestMessageTime: chat.latestMessageTime,
    };
  });

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

// Export Chat Service
export const ChatService = {
  accessChat,
  getChatListByUserId,
};