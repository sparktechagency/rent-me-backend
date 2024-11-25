import express from 'express';
// import auth from '../middlewares/auth';
// import { USER_ROLES } from '../../enums/user';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get(
  '/general-stat',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.generalStatForAdminDashboard
);

router.get(
  '/sale-revenue',
  //   auth(USER_ROLES.ADMIN),
  DashboardController.totalSaleAndRevenue
);

// router.get('/vendors', DashboardController.getVendors);

router.get('/orders', DashboardController.getAllOrders);
router.get(
  '/vendor-order-conversion-rate',
  DashboardController.getVendorsOrderConversionRate
);

router.get('/order-progress', DashboardController.getOrdersProgress);

router.get('/user-engagement', DashboardController.getUserEngagement);

router.get(
  '/user-service-taking-rate',
  DashboardController.getUserActivityTrend
);

router.get('/best-services', DashboardController.getBestServices);

router.get('/order-retention-rate', DashboardController.getOrderRetentionRate);
router.get(
  '/customer-retention-rate',
  DashboardController.getCustomerRetentionData
);

router.get('/revenue', DashboardController.getRevenue);

export const DashboardRoutes = router;
