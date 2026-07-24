const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../lib/email');
const referralService = require('../services/referralService');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

async function uniqueReferralCode(tx) {
  for (let i = 0; i < 5; i++) {
    const code = referralService.generateReferralCode();
    const existing = await tx.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

exports.register = async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 3600000); // 1 hour

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          totalBalance: 10000,
          referralCode: await uniqueReferralCode(tx),
          isEmailVerified: false,
          verificationCode,
          verificationCodeExpires,
        }
      });
      await referralService.createReferralIfCodeProvided(tx, { refereeId: created.id, code: referralCode });
      return created;
    });

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    // Send email verification code
    sendEmail(user.email, 'Verify your email - Meridian', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to Meridian!</h2>
        <p>Thank you for registering. Please verify your email address by using the 6-digit verification code below:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${verificationCode}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">This code will expire in 1 hour.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you did not request this email, please ignore it.</p>
      </div>
    `).catch(err => console.error('Verification email failed:', err));

    res.status(201).json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false, isEmailVerified: false } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    // Handle Google registered users trying to log in manually (passwordHash will be empty or generic)
    if (!user.passwordHash) return res.status(400).json({ error: 'Please login with Google.' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    if (user.isSuspended) {
      return res.status(403).json({ error: user.suspendedReason ? `Account suspended: ${user.suspendedReason}` : 'This account has been suspended.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false, isEmailVerified: user.isEmailVerified } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    
    // In MVP, we skip rigorous client ID validation if it's a placeholder, 
    // but in production, we verify properly.
    let payload;
    if (GOOGLE_CLIENT_ID === 'placeholder-client-id') {
      // Decode JWT locally just for testing if Google Client ID is not provided
      payload = jwt.decode(credential);
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    }

    const { email, name, sub } = payload;
    
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create a new user from Google
      user = await prisma.$transaction(async (tx) => {
        return tx.user.create({
          data: {
            email,
            username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
            passwordHash: '', // No password for Google auth
            totalBalance: 10000,
            referralCode: await uniqueReferralCode(tx),
            isEmailVerified: true,
          }
        });
      });

      // Send welcome email immediately for new Google users
      sendEmail(user.email, 'Welcome to Meridian! 🎉', `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Welcome, ${user.username}!</h2>
          <p>Thanks for joining Meridian. We have credited your account with <strong>10,000 points</strong> to start predicting markets!</p>
          <p>Happy predicting!</p>
        </div>
      `).catch(err => console.error('Welcome email failed:', err));
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false, isEmailVerified: user.isEmailVerified } 
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ error: 'Internal server error during Google Authentication' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpires: null,
      }
    });

    // Send welcome email upon successful verification!
    sendEmail(updated.email, 'Welcome to Meridian! 🎉', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to Meridian, ${updated.username}!</h2>
        <p>Thanks for verifying your email address. We have credited your account with <strong>10,000 points</strong> to start predicting markets!</p>
        <p>Happy predicting!</p>
      </div>
    `).catch(err => console.error('Welcome email failed:', err));

    res.json({
      message: 'Email verified successfully!',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        totalBalance: updated.totalBalance,
        isAdmin: updated.isAdmin || false,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error during email verification.' });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode,
        verificationCodeExpires,
      }
    });

    sendEmail(user.email, 'Verify your email - Meridian', `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Verify Your Email Address</h2>
        <p>Please verify your email address by using the 6-digit verification code below:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${verificationCode}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">This code will expire in 1 hour.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you did not request this email, please ignore it.</p>
      </div>
    `).catch(err => console.error('Verification resend email failed:', err));

    res.json({ message: 'Verification code resent successfully!' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error during resending verification.' });
  }
};
