import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { ServiceRoutes } from '../app/modules/service/service.route';
import { PackageRoutes } from '../app/modules/package/package.route';
import { ReviewRoutes } from '../app/modules/review/review.route';
import { OrderRoutes } from '../app/modules/order/order.route';
import { BookMarkRoutes } from '../app/modules/bookmark/bookmark.route';
import { PaymentRoutes } from '../app/modules/payment/payment.route';
import { CategoryRoutes } from '../app/modules/category/category.route';
import { OthersRoutes } from '../app/modules/others/others.route';
import { VendorRoutes } from '../app/modules/vendor/vendor.route';
import { CustomerRoutes } from '../app/modules/customer/customer.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { ChatBotRoutes } from '../app/modules/chat-bot/chatbot.route';

import { NotificationRoutes } from '../app/modules/notification/notification.route';
import { AdminRoutes } from '../app/modules/admin/admin.route';
import { DashboardRoutes } from '../app/modules/dashboard/dashboard.route';
const router = express.Router();

const apiRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/user',
    route: UserRoutes,
  },
  {
    path: '/vendor',
    route: VendorRoutes,
  },
  {
    path: '/customer',
    route: CustomerRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/service',
    route: ServiceRoutes,
  },
  {
    path: '/package',
    route: PackageRoutes,
  },
  {
    path: '/review',
    route: ReviewRoutes,
  },
  {
    path: '/order',
    route: OrderRoutes,
  },
  {
    path: '/bookmark',
    route: BookMarkRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/category',
    route: CategoryRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/message',
    route: MessageRoutes,
  },
  {
    path: '/chat-bot',
    route: ChatBotRoutes,
  },
  {
    path: '/dashboard',
    route: DashboardRoutes,
  },
  {
    path: '/others',
    route: OthersRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
