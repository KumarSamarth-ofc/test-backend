const express = require('express');
const router = express.Router();
const authService = require('../utils/auth');
const { upload } = require('../utils/imageUpload');
const {
    CampaignController,
    validateCreateCampaign,
    validateUpdateCampaign
} = require('../controllers/campaignController');

// All routes require authentication
router.use(authService.authenticateToken);

// Campaign CRUD operations
router.post('/', authService.requireRole(['brand_owner', 'admin']), upload.single('image'), validateCreateCampaign, CampaignController.createCampaign);
router.get('/', CampaignController.getCampaigns);
router.get('/stats', CampaignController.getCampaignStats);
router.get('/:id', CampaignController.getCampaign);
router.put('/:id', authService.requireRole(['brand_owner', 'admin']), upload.single('image'), validateUpdateCampaign, CampaignController.updateCampaign);
router.delete('/:id', authService.requireRole(['brand_owner', 'admin']), CampaignController.deleteCampaign);

module.exports = router; 