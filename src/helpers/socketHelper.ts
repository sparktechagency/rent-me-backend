import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { NotificationService } from '../app/modules/notification/notification.service';

const socket = (io: Server) => {
  io.on('connection', socket => {
    logger.info(colors.blue('A user connected'));

    socket.on(`notificationRead`, data => {
      const notificationId = data?.id;
      NotificationService.changeNotificationStatus(notificationId);
    });

    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export const socketHelper = { socket };
