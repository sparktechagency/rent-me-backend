import express from 'express';
import { CartController } from './cart.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidations } from './cart.validation';

const router = express.Router();

router.post(
    '/',
    auth(USER_ROLES.CUSTOMER),
    validateRequest(CartValidations.manageCartZodSchema),
    CartController.manageCart
);

router.get(
    '/',
    auth(USER_ROLES.CUSTOMER),
    CartController.getCart
);

router.delete(
    '/',
    auth(USER_ROLES.CUSTOMER),
    CartController.deleteCart
);

export const CartRoutes = router;
