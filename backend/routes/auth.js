const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/google
router.post('/google', authController.googleAuth);

// POST /api/auth/verify-email
router.post('/verify-email', authenticateToken, authController.verifyEmail);

// POST /api/auth/resend-verification
router.post('/resend-verification', authenticateToken, authController.resendVerification);

module.exports = router;
