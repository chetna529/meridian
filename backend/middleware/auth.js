const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    try {
      // Suspension can happen mid-session — check on every request so a suspended
      // account can't keep trading on a token issued before the suspension.
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { isSuspended: true } });
      if (dbUser?.isSuspended) {
        return res.status(403).json({ error: 'This account has been suspended.' });
      }
    } catch (dbErr) {
      // If the suspension check itself fails, don't hard-block the whole API on a DB hiccup.
      console.error('Suspension check failed:', dbErr.message);
    }

    req.user = user; // attach user payload to request
    next();
  });
}

module.exports = { authenticateToken };
