import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { CategoryValidation } from './category.validation';
import { CategoryController } from './category.controller';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = CategoryValidation.createCategoryZodSchema.parse(
      JSON.parse(req?.body?.data)
    );

    return CategoryController.createCategory(req, res, next);
  }
);
router.get('/:id', CategoryController.getCategoryById);
router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  fileUploadHandler(),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = CategoryValidation.updateCategoryZodSchema.parse(
        JSON.parse(req?.body?.data)
      );
    }

    return CategoryController.updateCategoryById(req, res, next);
  }
);
router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  CategoryController.deleteCategoryById
);

router.get('/', CategoryController.getAllCategory);

export const CategoryRoutes = router;
