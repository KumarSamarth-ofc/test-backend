const router = require('express').Router();
const mouController = require('../controllers/mouController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateGetLatestMOU,
  validateAcceptMOU,
  validateCreateMOU,
} = require('../validators/mouValidators');

router.get(
  '/application/:applicationId',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(['INFLUENCER', 'BRAND_OWNER', 'ADMIN']),
  validateGetLatestMOU,
  mouController.getLatestMOU
);

router.post(
  '/:id/accept',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(['INFLUENCER', 'BRAND_OWNER']),
  validateAcceptMOU,
  mouController.acceptMOU
);

router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole('ADMIN'),
  validateCreateMOU,
  mouController.createMOU
);

module.exports = router;

