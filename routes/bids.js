const express = require('express');
const router = express.Router();
const authService = require('../utils/auth');
const { upload } = require('../utils/imageUpload');
const {
    BidController,
    validateCreateBid,
    validateUpdateBid
} = require('../controllers/bidController');

// All routes require authentication
router.use(authService.authenticateToken);

// Bid CRUD operations
router.post('/', authService.requireRole(['brand_owner', 'admin']), upload.single('image'), validateCreateBid, BidController.createBid);
router.get('/', BidController.getBids);
router.get('/stats', BidController.getBidStats);
router.get('/:id', BidController.getBid);
router.put('/:id', authService.requireRole(['brand_owner', 'admin']), upload.single('image'), validateUpdateBid, BidController.updateBid);
router.delete('/:id', authService.requireRole(['brand_owner', 'admin']), BidController.deleteBid);

module.exports = router; 