// Consumers for domain events published via lib/eventBus.js. Database writes (notifications,
// ledger rows, etc.) already happened inside the originating request's transaction — these
// handlers are purely for post-commit fan-out: sockets, and any future side effects (email,
// analytics). Nothing here is the source of truth.

const prisma = require('../lib/prisma');
const eventBus = require('../lib/eventBus');
const logger = require('../lib/logger');

function registerEventHandlers(io) {
  eventBus.on('PredictionPlaced', async (payload) => {
    const { marketId, userId, username, prices, totalVolume, sentiment } = payload;
    io.to(`market:${marketId}`).emit('odds-updated', { marketId, prices, totalVolume, sentiment });

    try {
      const followers = await prisma.userFollower.findMany({ where: { userId }, select: { followerId: true } });
      for (const follower of followers) {
        io.to(`user:${follower.followerId}`).emit('follower-prediction', {
          username,
          marketId,
          optionText: payload.optionText,
        });
      }
    } catch (err) {
      logger.warn('Failed to broadcast follower-prediction', err.message);
    }
  });

  eventBus.on('MarketLocked', async (payload) => {
    io.to(`market:${payload.marketId}`).emit('market-locked', payload);
  });

  eventBus.on('MarketResolved', async (payload) => {
    io.to(`market:${payload.marketId}`).emit('market-resolved', payload);
  });

  eventBus.on('DisputeFiled', async (payload) => {
    io.to(`market:${payload.marketId}`).emit('market-disputed', payload);
  });

  eventBus.on('DisputeResolved', async (payload) => {
    io.to(`market:${payload.marketId}`).emit('dispute-resolved', payload);
  });

  eventBus.on('LeaderboardUpdated', async (payload) => {
    io.emit('leaderboard-updated', payload);
  });

  eventBus.on('NotificationCreated', async (payload) => {
    io.to(`user:${payload.userId}`).emit('notification:new', payload);
  });
}

module.exports = { registerEventHandlers };
