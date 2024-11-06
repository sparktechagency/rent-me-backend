import express from 'express';
import { OthersController } from './others.controller';
import validateRequest from '../../middlewares/validateRequest';
import { othersValidation } from './others.validation';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = express.Router();

router.post(
  '/privacy-policy',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createPrivacyPolicyZodSchema),
  OthersController.createPrivacyPolicy
);
router.post(
  '/terms-and-condition',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createTermsAndConditionsZodSchema),
  OthersController.createTermsAndConditions
);
router.post(
  '/faq',
  auth(USER_ROLES.ADMIN),
  validateRequest(othersValidation.createFaqsZodSchema),
  OthersController.createFaQs
);

router.delete(
  '/privacy-policy/:id',
  auth(USER_ROLES.ADMIN),
  OthersController.deletePrivacyPolicy
);
router.delete(
  '/terms-and-conditions/:id',
  auth(USER_ROLES.ADMIN),
  OthersController.deleteTermsAndConditions
);
router.delete('/faq/:id', auth(USER_ROLES.ADMIN), OthersController.deleteFaQs);

router.get('/privacy-policy/:type', OthersController.getPrivacyPolicy);
router.get(
  '/terms-and-conditions/:type',
  OthersController.getTermsAndConditions
);
router.get('/faq/:type', OthersController.getFaQs);

export const OthersRoutes = router;
