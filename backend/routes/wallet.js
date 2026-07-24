const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

router.get('/ledger', authenticateToken, walletController.getLedger);
router.post('/deposit', authenticateToken, walletController.depositFunds);
router.post('/withdraw', authenticateToken, walletController.withdrawFunds);

module.exports = router;
