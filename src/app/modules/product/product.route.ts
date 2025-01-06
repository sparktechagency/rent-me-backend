import express, { NextFunction, Request, Response } from 'express';
import { ProductController } from './product.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ProductValidations } from './product.validation';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = ProductValidations.createProductZodSchema.parse(
        JSON.parse(req?.body?.data)
      );
    }
    return ProductController.createProduct(req, res, next);
  }
);

router.patch(
  '/:id',
  auth(USER_ROLES.VENDOR),
  validateRequest(ProductValidations.updateProductZodSchema),
  fileUploadHandler(),
  (req, res, next) => {
    if (req.body.data) {
      req.body = ProductValidations.updateProductZodSchema.parse(
        JSON.parse(req?.body?.data)
      );
    }
    return ProductController.updateProduct(req, res, next);
  }
);

router.delete('/:id', auth(USER_ROLES.VENDOR), ProductController.deleteProduct);

router.get(
  '/',
  auth(USER_ROLES.VENDOR, USER_ROLES.CUSTOMER, USER_ROLES.ADMIN),
  ProductController.getAllProduct
);
export const ProductRoutes = router;
