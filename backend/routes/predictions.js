const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, predictionController.placePrediction);
router.get('/my-predictions', authenticateToken, predictionController.getUserPredictions);

module.exports = router;
