import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryValidation } from './category.validation';
import { CategoryController } from './category.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);
router.get('/:id', CategoryController.getCategoryById);
router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategoryById
);
router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.VENDOR),
  CategoryController.deleteCategoryById
);

router.get('/', CategoryController.getAllCategory);

export const CategoryRoutes = router;
