import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { ChatBotService } from './chatbot.service';

const chatWithChatBot = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    const user = req.user;

    const result = await ChatBotService.chatWithChatBot(user, message);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Chat with chatbot successfully',
      data: result,
    });
  }
);

export const ChatBotController = {
  chatWithChatBot,
};
