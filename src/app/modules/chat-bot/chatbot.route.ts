import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ChatBotController } from './chatbot.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  ChatBotController.chatWithChatBot
);

export const ChatBotRoutes = router;
