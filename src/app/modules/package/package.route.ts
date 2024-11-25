import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { PackageValidation } from './package.validation';
import { PackageController } from './package.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.VENDOR),
  validateRequest(PackageValidation.createPackageZodSchema),
  PackageController.createPackage
);

router.patch(
  '/:id',
  auth(USER_ROLES.VENDOR),
  validateRequest(PackageValidation.updatePackageZodSchema),
  PackageController.updatePackage
);

router.get('/:id', PackageController.getSinglePackage);
router.delete('/:id', PackageController.deletePackage);

export const PackageRoutes = router;
