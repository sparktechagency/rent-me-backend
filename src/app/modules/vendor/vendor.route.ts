import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { VendorController } from './vendor.controller';
import { VendorValidation } from './vendor.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

//update vendor
router.patch(
  '/',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = VendorValidation.updateVendorZodSchema.parse(
        JSON.parse(req.body.data)
      );
    }

    return VendorController.updateVendorProfile(req, res, next);
  }
);

//get single vendor by custom Id
router.get(
  '/profile',
  auth(USER_ROLES.VENDOR),
  VendorController.getVendorProfile
);

//delete vendor Id
router.delete(
  '/delete',
  auth(USER_ROLES.VENDOR),
  VendorController.deleteVendorProfile
);

//get vendor profile by custom id
router.get('/:id', VendorController.getSingleVendor);

//get all vendor for home page search and filter
router.get('/', VendorController.getAllVendor);

router.get(
  '/statistic/revenue/',
  auth(USER_ROLES.VENDOR),
  VendorController.getVendorRevenue
);

router.get(
  '/statistic/order/',
  auth(USER_ROLES.VENDOR),
  VendorController.getVendorOrders
);

router.get(
  '/statistic/retention/',
  auth(USER_ROLES.VENDOR),
  VendorController.getCustomerRetentionData
);
export const VendorRoutes = router;
