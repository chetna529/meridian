const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

router.get('/summarize-market/:id', aiController.summarizeMarket);
router.post('/chat/:id', authenticateToken, aiController.chat);
router.get('/risk-analysis/:id', aiController.assessRisk);
router.get('/recommendations/:id', aiController.getRecommendations);
router.get('/news-summary/:id', aiController.getNewsSummary);

module.exports = router;
