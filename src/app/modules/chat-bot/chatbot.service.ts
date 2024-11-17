import { Message } from './../message/message.model';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { openai } from '../../../util/openAi';

const chatWithChatBot = async (user: any, message: string) => {
  try {
    const systemMessage = `
        You are an assistant for a mobile app where vendors sell services to customers.
        - If the user is a customer, assist with booking services, payments, live tracking, or general inquiries.
        - If the user is a vendor, assist with managing requests, updating statuses, and resolving issues.
      `;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: user.role, content: message },
      ],
    });

    return response;
  } catch (error: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.error.message);
  }
};

export const ChatBotService = {
  chatWithChatBot,
};
