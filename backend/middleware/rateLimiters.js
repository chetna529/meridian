const rateLimit = require('express-rate-limit');

// Route-specific limiters, tighter than the general API limiter applied in index.js.
const commentLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const disputeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false });

module.exports = { commentLimiter, disputeLimiter, aiLimiter };
