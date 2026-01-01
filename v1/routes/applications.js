const router = require('express').Router();
const { applicationController } = require('../controllers');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.post(
  '/',
  authenticate,
  requireRole('INFLUENCER'),
  validateApply,
  applicationController.apply
);

router.post(
  '/:id/accept',
  authenticate,
  requireRole('BRAND_OWNER'),
  validateAccept,
  applicationController.accept
);

router.post(
  '/:id/cancel',
  authenticate,
  validateCancel,
  applicationController.cancel
); // no cancellation

router.post(
  '/:id/complete',
  authenticate,
  requireRole('ADMIN'),
  validateComplete,
  applicationController.complete
);

module.exports = router;
