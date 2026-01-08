const router = require('express').Router();
const mouController = require('../controllers/mouController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateGetLatestMOU,
  validateAcceptMOU,
  validateCreateMOU,
} = require('../validators/mouValidators');

// Get latest MOU by application ID (Influencer, Brand Owner, Admin)
router.get(
  '/application/:applicationId',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(['INFLUENCER', 'BRAND_OWNER', 'ADMIN']),
  validateGetLatestMOU,
  mouController.getLatestMOU
);

// Accept MOU (Influencer, Brand Owner)
router.post(
  '/:id/accept',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(['INFLUENCER', 'BRAND_OWNER']),
  validateAcceptMOU,
  mouController.acceptMOU
);

// Create MOU (Admin only)
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.requireRole('ADMIN'),
  validateCreateMOU,
  mouController.createMOU
);

module.exports = router;

