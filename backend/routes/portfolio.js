const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, portfolioController.getPortfolio);

module.exports = router;
