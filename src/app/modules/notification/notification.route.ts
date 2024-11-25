import express from 'express';

import { NotificationController } from './notification.controller';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post('/', NotificationController.createNotification);
router.get(
  '/',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR, USER_ROLES.ADMIN),
  NotificationController.getNotifications
);
router.get('/:id', NotificationController.getSingleNotification);

export const NotificationRoutes = router;
