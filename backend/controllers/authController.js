const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../lib/email');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        totalBalance: 10000
      }
    });

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    // Send welcome email
    sendEmail(user.email, 'Welcome to Meridian! 🎉', `
      <h1>Welcome, ${user.username}!</h1>
      <p>Thanks for joining Meridian. We have credited your account with <strong>10,000 points</strong> to start predicting markets!</p>
      <p>Happy predicting!</p>
    `).catch(err => console.error('Welcome email failed:', err));

    res.status(201).json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false } 
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

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false } 
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
      user = await prisma.user.create({
        data: {
          email,
          username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
          passwordHash: '', // No password for Google auth
          totalBalance: 10000
        }
      });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: user.isAdmin || false }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email, totalBalance: user.totalBalance, isAdmin: user.isAdmin || false } 
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ error: 'Internal server error during Google Authentication' });
  }
};
