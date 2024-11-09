import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ServiceValidation } from './service.validation';
import { ServiceController } from './service.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = ServiceValidation.createServiceZodSchema.parse(
      JSON.parse(req?.body?.data)
    );

    return ServiceController.createService(req, res, next);
  }
);

router.patch(
  '/:id',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    req.body.data
      ? (req.body = ServiceValidation.updateServiceZodSchema.parse(
          JSON.parse(req.body.data)
        ))
      : {};
    return ServiceController.updateService(req, res, next);
  }
);
router.delete('/:id', auth(USER_ROLES.VENDOR), ServiceController.deleteService);

//get service
router.get('/:id', ServiceController.getSingleService);

//get packages by service Id
router.get('/package/:id', ServiceController.getAllPackageByServiceId);

//by Vendor Id
router.get('/vendor/:id', ServiceController.getAllServiceByVendorId);

router.get('/', ServiceController.getAllService);

export const ServiceRoutes = router;
