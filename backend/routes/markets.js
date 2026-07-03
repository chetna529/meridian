const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Public routes
router.get('/', marketController.getMarkets);
router.get('/:id', marketController.getMarket);

// Protected admin routes
router.post('/', authenticateToken, requireAdmin, marketController.createMarket);
router.post('/:id/resolve', authenticateToken, requireAdmin, marketController.resolveMarket);
router.delete('/:id', authenticateToken, requireAdmin, marketController.deleteMarket);

// GET /api/markets/:id/comments
router.get('/:id/comments', marketController.getComments);

// POST /api/markets/:id/comments
router.post('/:id/comments', authenticateToken, marketController.addComment);

// POST /api/markets/comments/:commentId/react
router.post('/comments/:commentId/react', authenticateToken, marketController.reactToComment);

// GET /api/markets/:id/real-data
router.get('/:id/real-data', marketController.fetchRealMarketData);

module.exports = router;
