const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const disputeController = require('../controllers/disputeController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { commentLimiter, disputeLimiter } = require('../middleware/rateLimiters');

// Public routes
router.get('/', marketController.getMarkets);
router.get('/:id', marketController.getMarket);
router.get('/:id/price-history', marketController.getPriceHistory);
router.get('/:id/analytics', marketController.getAnalytics);
router.get('/:id/raw-data', marketController.getRawAnalyticsData);

// Protected admin routes — market lifecycle
router.post('/', authenticateToken, requireAdmin, marketController.createMarket);
router.post('/:id/submit', authenticateToken, requireAdmin, marketController.submitForReview);
router.post('/:id/approve', authenticateToken, requireAdmin, marketController.approveMarket);
router.post('/:id/schedule-publish', authenticateToken, requireAdmin, marketController.schedulePublish);
router.post('/:id/lock', authenticateToken, requireAdmin, marketController.lockMarket);
router.post('/:id/start-resolving', authenticateToken, requireAdmin, marketController.startResolving);
router.post('/:id/resolve', authenticateToken, requireAdmin, marketController.resolveMarket);
router.post('/:id/cancel', authenticateToken, requireAdmin, marketController.cancelMarket);
router.post('/:id/archive', authenticateToken, requireAdmin, marketController.archiveMarket);
router.delete('/:id', authenticateToken, requireAdmin, marketController.deleteMarket);

// Disputes
router.post('/:id/disputes', authenticateToken, disputeLimiter, disputeController.raiseDispute);

// Comments
router.get('/:id/comments', marketController.getComments);
router.post('/:id/comments', authenticateToken, commentLimiter, marketController.addComment);
router.post('/comments/:commentId/react', authenticateToken, commentLimiter, marketController.reactToComment);

// GET /api/markets/:id/real-data
router.get('/:id/real-data', marketController.fetchRealMarketData);

module.exports = router;
