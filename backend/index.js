require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.set('io', io);
app.use(helmet());
app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

app.use('/api/auth', authLimiter);
app.use('/api/predictions', apiLimiter);

require('./jobs/leaderboardJob');
require('./jobs/marketExpiryJob');
require('./jobs/settlementJob');

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/markets', require('./routes/markets'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/users', require('./routes/users'));
app.use('/api/positions', require('./routes/positions'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/transactions', require('./routes/transactions'));

const { registerSocketHandlers } = require('./websocket/handler');
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/health/ready', async (req, res) => {
  const checks = { db: false, redis: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch (err) {
    checks.db = false;
  }
  try {
    const cache = require('./lib/cache');
    await cache.connect();
    checks.redis = true;
  } catch (err) {
    checks.redis = false;
  }
  const ok = checks.db && checks.redis;
  res.status(ok ? 200 : 503).json({ ready: ok, checks });
});
