const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authService = require('../utils/auth');

// User endpoints
router.post('/', authService.authenticateToken, reportController.createReport);
router.get('/mine', authService.authenticateToken, reportController.myReports);

// Admin: manage report reasons
router.get('/reasons', authService.authenticateToken, authService.requireRole('admin'), reportController.listReasons);
router.post('/reasons', authService.authenticateToken, authService.requireRole('admin'), reportController.createReason);
router.put('/reasons/:id', authService.authenticateToken, authService.requireRole('admin'), reportController.updateReason);
router.delete('/reasons/:id', authService.authenticateToken, authService.requireRole('admin'), reportController.deleteReason);

// Admin: list reports and block/unblock users
router.get('/', authService.authenticateToken, authService.requireRole('admin'), reportController.listReports);
router.post('/block', authService.authenticateToken, authService.requireRole('admin'), reportController.blockUser);
router.post('/unblock', authService.authenticateToken, authService.requireRole('admin'), reportController.unblockUser);

// Admin: update report status
router.post('/:id/actions', authService.authenticateToken, authService.requireRole('admin'), reportController.updateReportStatus);

module.exports = router;
