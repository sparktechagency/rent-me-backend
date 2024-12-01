import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.post(
  '/onboard',
  auth(USER_ROLES.VENDOR),
  PaymentController.onboardVendor
);

router.post(
  '/checkout/:orderId',
  auth(USER_ROLES.CUSTOMER),
  PaymentController.createCheckoutSession
);

router.post(
  '/transfer-vendor/:orderId',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN),
  PaymentController.transferToVendor
);

router.post('/add-fund', PaymentController.addFundToAccount);
// router.post('/webhook', PaymentController.webhooks);

router.get('/callback', (req, res) => {
  res.send('callback hit');
});

export const PaymentRoutes = router;
