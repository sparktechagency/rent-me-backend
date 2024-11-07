import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { VendorController } from './vendor.controller';

const router = express.Router();

//update vendor
router.patch('/', auth(USER_ROLES.VENDOR), VendorController.updateVendor);
//get single vendor by custom Id
router.get('/:id');
//get all vendor
router.get('/');

//disable vendor account
router.patch('/disable/');
export const VendorRoutes = router;
