const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const challengeController = require('../controllers/challengeController');
const feedController = require('../controllers/feedController');
const recommendationController = require('../controllers/recommendationController');

// Activity Feed & Daily Challenges
router.get('/me/feed', authenticateToken, feedController.getPersonalizedFeed);
router.get('/me/referrals', authenticateToken, userController.getMyReferrals);
router.get('/me/recommendations', authenticateToken, recommendationController.getRecommendations);
router.get('/me/challenges', authenticateToken, challengeController.getDailyChallenges);
router.post('/me/challenges/claim', authenticateToken, challengeController.claimReward);

// Profile and settings
router.get('/me/profile-detail', authenticateToken, userController.getMyProfileDetail);
router.put('/me/profile', authenticateToken, userController.updateMyProfile);
router.post('/me/security/change-password', authenticateToken, userController.changePassword);
router.post('/me/security/change-email', authenticateToken, userController.changeEmail);
router.delete('/me', authenticateToken, userController.deleteAccount);

// Admin user management
router.get('/admin/all', authenticateToken, requireAdmin, userController.getAllUsers);
router.post('/admin/:id/badges', authenticateToken, requireAdmin, userController.grantBadge);
router.get('/admin/:id/detail', authenticateToken, requireAdmin, userController.getUserDetailAdmin);
router.post('/admin/:id/wallet-adjust', authenticateToken, requireAdmin, userController.adjustUserWallet);
router.post('/admin/:id/suspend', authenticateToken, requireAdmin, userController.suspendUser);
router.post('/admin/:id/reactivate', authenticateToken, requireAdmin, userController.reactivateUser);
router.post('/admin/:id/admin-status', authenticateToken, requireAdmin, userController.setAdminStatus);

// Wildcard routes
router.get('/:id', userController.getUserProfile);
router.post('/:id/follow', authenticateToken, userController.followUser);
router.post('/:id/unfollow', authenticateToken, userController.unfollowUser);

module.exports = router;
