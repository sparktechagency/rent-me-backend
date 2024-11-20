import express from 'express';

import { NotificationController } from './notification.controller';

const router = express.Router();

router.post('/', NotificationController.createNotification);

export const NotificationRoutes = router;
