import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { OrderController } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';

const router = express.Router();

router.get(
  '/delivery-fee',
  auth(USER_ROLES.CUSTOMER),
  OrderController.getDeliveryCharge
);

router.post(
  '/create-order',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(OrderValidation.createOrderZodSchema),
  OrderController.createOrder
);

//get order by user
router.get(
  '/user/',
  auth(USER_ROLES.VENDOR, USER_ROLES.CUSTOMER),
  OrderController.getAllOrderByUserId
);

router.get('/:id', OrderController.getSingleOrder);

//decline order only for customer
router.patch(
  '/decline/:id',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(OrderValidation.updateOrderStatusValidationForCustomer),
  OrderController.declineOrder
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

router.patch(
  '/start-delivery/:id',
  auth(USER_ROLES.VENDOR),
  OrderController.startOrderDelivery
);
export const OrderRoutes = router;
