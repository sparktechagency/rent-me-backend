import { z } from 'zod';

const chatWithChatBotValidationSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
  }),
});
