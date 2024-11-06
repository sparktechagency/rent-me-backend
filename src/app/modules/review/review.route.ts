import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReviewValidation } from './review.validation';
import { ReviewController } from './review.controller';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview
);
router.get('/vendor/:id', ReviewController.getAllReviews);
router.get('/:id', ReviewController.getSingleReview);
router.patch(
  '/:id',
  auth(USER_ROLES.USER),
  validateRequest(ReviewValidation.updateReviewZodSchema),
  ReviewController.updateReview
);
router.delete('/:id', auth(USER_ROLES.USER), ReviewController.deleteReview);

export const ReviewRoutes = router;
