import { JwtPayload } from 'jsonwebtoken';

import { Chat } from './chat.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { Types } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';

const accessChat = async (
  user: JwtPayload,
  payload: { participantId: string }
) => {
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
  });

  if (isChatExists) {
    const result = isChatExists.participants.find(
      participant => participant._id.toString() !== user.id
    );
    return {
      chatId: isChatExists._id,
      ...result!.toObject(),
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
  });

  if (!newChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create chat.');
  }

  const participantData = newChat.participants.find(
    participant => participant._id.toString() !== user.id
  );

  return {
    chatId: newChat._id,
    ...participantData!.toObject(),
  };
};

// const getChatListByUserId = async (
//   user: JwtPayload,
//   paginationOptions: IPaginationOptions,
//   searchTerm?: string
// ) => {
//   const { page, limit, skip, sortBy, sortOrder } =
//     paginationHelper.calculatePagination(paginationOptions);

//   // Define the base query
//   const baseQuery = {
//     participants: { $in: [user.id] },
//   };

//   // Fetch chats with the base query, population, sorting, and pagination
//   const chats = await Chat.find(baseQuery)
//     .populate({
//       path: 'participants',
//       select: 'vendor customer',
//       populate: [
//         { path: 'customer', select: 'name profileImg' },
//         { path: 'vendor', select: 'name profileImg' },
//       ],
//     })
//     .sort({ [sortBy]: sortOrder })
//     .skip(skip)
//     .limit(limit)
//     .lean();

//   if (!chats) {
//     throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get chat list');
//   }

//   // Filter the chats based on the search term
//   const filteredChats = chats.filter(chat =>
//     searchTerm
//       ? chat.participants.some(
//           participant =>
//             participant.customer?.name
//               ?.toLowerCase()
//               .includes(searchTerm.toLowerCase()) ||
//             participant.vendor?.name
//               ?.toLowerCase()
//               .includes(searchTerm.toLowerCase())
//         )
//       : true
//   );

//   // Map and format the result
//   const result = filteredChats.map(chat => {
//     const otherParticipant = chat.participants.find(
//       participant => participant._id.toString() !== user.id
//     );

//     return {
//       chatId: chat._id,
//       ...otherParticipant,
//     };
//   });

//   // Count total chats matching the base query
//   const total = await Chat.countDocuments(baseQuery);

//   return {
//     meta: {
//       page,
//       limit,
//       total,
//       totalPage: Math.ceil(total / limit),
//     },
//     data: result,
//   };
// };

const getChatListByUserId = async (
  user: JwtPayload,
  paginationOptions: IPaginationOptions,
  searchTerm?: string
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  // Define the base query
  const baseQuery = {
    participants: { $in: [user.id] },
  };

  // Fetch chats with the base query, population, sorting, and pagination
  const chats = await Chat.find(baseQuery)
    .populate({
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

  // Filter the chats based on the search term
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
  );

  // Calculate the total count based on the search filter
  const total = await Chat.find(baseQuery)
    .populate({
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

  // Map and format the result
  const result = filteredChats.map(chat => {
    const otherParticipant = chat.participants.find(
      participant => participant._id.toString() !== user.id
    );

    return {
      chatId: chat._id,
      ...otherParticipant,
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

export const ChatService = {
  accessChat,
  getChatListByUserId,
};
