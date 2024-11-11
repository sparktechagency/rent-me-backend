import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReviewValidation } from './review.validation';
import { ReviewController } from './review.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview
);

//not necessary for now
router.patch(
  '/:id',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(ReviewValidation.updateReviewZodSchema),
  ReviewController.updateReview
);

router.get('/vendor/:id', ReviewController.getAllReviewsForVendorById);

router.get('/:id', ReviewController.getSingleReview);

router.delete('/:id', auth(USER_ROLES.CUSTOMER), ReviewController.deleteReview);

export const ReviewRoutes = router;
