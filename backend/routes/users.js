const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const challengeController = require('../controllers/challengeController');
const feedController = require('../controllers/feedController');

// Activity Feed & Daily Challenges
router.get('/me/feed', authenticateToken, feedController.getPersonalizedFeed);
router.get('/me/challenges', authenticateToken, challengeController.getDailyChallenges);
router.post('/me/challenges/claim', authenticateToken, challengeController.claimReward);

// Admin user management
router.get('/admin/all', authenticateToken, requireAdmin, userController.getAllUsers);
router.post('/admin/:id/badges', authenticateToken, requireAdmin, userController.grantBadge);

// Wildcard routes
router.get('/:id', userController.getUserProfile);
router.post('/:id/follow', authenticateToken, userController.followUser);
router.post('/:id/unfollow', authenticateToken, userController.unfollowUser);

module.exports = router;
