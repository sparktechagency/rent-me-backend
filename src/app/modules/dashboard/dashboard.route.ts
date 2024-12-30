import express from 'express';

import { DashboardController } from './dashboard.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.get(
  '/general-stat',
  auth(USER_ROLES.ADMIN),
  DashboardController.generalStatForAdminDashboard
);

router.get(
  '/sale-revenue',
  auth(USER_ROLES.ADMIN),
  DashboardController.totalSaleAndRevenue
);

// router.get('/vendors', DashboardController.getVendors);

router.get('/orders', auth(USER_ROLES.ADMIN), DashboardController.getAllOrders);
router.get(
  '/vendor-order-conversion-rate',
  auth(USER_ROLES.ADMIN),
  DashboardController.getVendorsOrderConversionRate
);

router.get(
  '/order-progress',
  auth(USER_ROLES.ADMIN),
  DashboardController.getOrdersProgress
);

router.get(
  '/user-engagement',
  auth(USER_ROLES.ADMIN),
  DashboardController.getUserEngagement
);

router.get(
  '/user-service-taking-rate',
  auth(USER_ROLES.ADMIN),
  DashboardController.getUserActivityTrend
);

router.get(
  '/best-services',
  auth(USER_ROLES.ADMIN),
  DashboardController.getBestServices
);

router.get(
  '/order-retention-rate',
  auth(USER_ROLES.ADMIN),
  DashboardController.getOrderRetentionRate
);
router.get(
  '/customer-retention-rate',
  auth(USER_ROLES.ADMIN),

  DashboardController.getCustomerRetentionData
);

router.get('/revenue', auth(USER_ROLES.ADMIN), DashboardController.getRevenue);

router.get(
  '/overall-stat',
  auth(USER_ROLES.ADMIN),
  DashboardController.getYearlyActivityData
);

router.post(
  '/restrict-active-user/:id',
  auth(USER_ROLES.ADMIN),
  DashboardController.restrictOrActivateUserAccount
);

export const DashboardRoutes = router;
