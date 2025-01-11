import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { NotificationService } from '../app/modules/notification/notification.service';
import { stopDelivery } from './deliveryHelper';

const socket = (io: Server) => {
  io.on('connection', socket => {
    logger.info(colors.blue('A user connected'));

    socket.on(`notificationRead`, data => {
      const notificationId = data?.id;
      NotificationService.changeNotificationStatus(notificationId);
    });

    // Handling live tracking
    socket.on('liveTracking', async data => {
      try {
        const { orderId, latitude, longitude } = data;
        if (!orderId || latitude == null || longitude == null) {
          return;
        }

        // Check for delivery status
        const updatedOrder = await stopDelivery(orderId, longitude, latitude);
        if (!updatedOrder) {
          return;
        }
        // Emit live tracking data
        io.emit(`orderTracking::${orderId}`, {
          longitude: longitude,
          latitude: latitude,
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error in liveTracking: ${error.message}`);
        } else {
          logger.error('Error in liveTracking: unknown error');
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export const socketHelper = { socket };
