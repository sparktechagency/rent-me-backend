import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { AuthValidation } from '../auth/auth.validation';
import validateRequest from '../../middlewares/validateRequest';
import { ServiceValidation } from './service.validation';
import { ServiceController } from './service.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  // validateRequest(ServiceValidation.createServiceZodSchema),
  ServiceController.createService
);
router.get('/:id', ServiceController.getSingleService);
router.patch(
  '/:id',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  validateRequest(ServiceValidation.updateServiceZodSchema),
  ServiceController.updateService
);
router.delete('/:id', auth(USER_ROLES.VENDOR), ServiceController.deleteService);

//search Filter and pagination needed
router.get('/', ServiceController.getAllService);

export const ServiceRoutes = router;
