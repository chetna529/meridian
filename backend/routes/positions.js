const express = require('express');
const router = express.Router();
const positionsController = require('../controllers/positionsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, positionsController.getMyPositions);

module.exports = router;
