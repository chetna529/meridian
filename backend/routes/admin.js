const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const disputeController = require('../controllers/disputeController');
const notificationAdminController = require('../controllers/notificationAdminController');
const reportsController = require('../controllers/reportsController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(authenticateToken, requireAdmin);

router.get('/recent-activity', adminController.getRecentActivity);
router.get('/overview-trends', adminController.getOverviewTrends);
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/fraud-flags', adminController.listFraudFlags);
router.post('/fraud-flags/:id/review', adminController.reviewFraudFlag);
router.get('/disputes', disputeController.listDisputes);
router.post('/disputes/:id/review', disputeController.reviewDispute);

// Market management
router.get('/markets', adminController.listMarketsAdmin);
router.post('/markets/bulk', adminController.bulkMarketAction);
router.get('/markets/:id/timeline', adminController.getMarketTimeline);
router.get('/markets/:id/participants', adminController.getMarketParticipants);
router.post('/markets/:id/resolve/preview', adminController.previewResolution);
router.post('/comments/:commentId/pin', adminController.togglePinComment);
router.delete('/comments/:commentId', adminController.deleteComment);

// Wallet & transactions
router.get('/wallet-ledger', adminController.listWalletLedgerAdmin);

// Notification center
router.get('/notifications', notificationAdminController.listBroadcasts);
router.post('/notifications', notificationAdminController.createBroadcast);
router.post('/notifications/:id/cancel', notificationAdminController.cancelBroadcast);

// Reports & exports
router.get('/reports/summary', reportsController.getSummary);
router.get('/reports/export/markets', reportsController.exportMarkets);
router.get('/reports/export/users', reportsController.exportUsers);
router.get('/reports/export/ledger', reportsController.exportLedger);

module.exports = router;
