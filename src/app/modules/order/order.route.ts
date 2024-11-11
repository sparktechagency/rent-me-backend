import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { OrderController } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';

const router = express.Router();

router.post(
  '/create-order',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(OrderValidation.createOrderZodSchema),
  OrderController.createOrder
);

router.get(
  '/user/',
  auth(USER_ROLES.VENDOR, USER_ROLES.CUSTOMER),
  OrderController.getAllOrderByUserId
);

router.get('/:id', OrderController.getSingleOrder);

//decline order only for customer
router.patch(
  '/confirm-cancel/:id',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(OrderValidation.updateOrderStatusValidationForCustomer),
  OrderController.declineOrConfirmOrder
);
//api to reject or accept order by vendor
router.patch(
  '/accept-reject/:id',
  auth(USER_ROLES.VENDOR),
  validateRequest(OrderValidation.updateOrderStatusValidationForVendor),
  OrderController.rejectOrAcceptOrder
);

router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR, USER_ROLES.CUSTOMER),

  OrderController.getAllOrders
);

export const OrderRoutes = router;
