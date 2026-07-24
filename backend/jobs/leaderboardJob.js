const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const eventBus = require('../lib/eventBus');
const cache = require('../lib/cache');
const logger = require('../lib/logger');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const leaderboardQueue = new Queue('leaderboardQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

function computeTrustScore({ accuracy, totalPredictions, accountAgeDays, openFraudFlags }) {
  const accuracyComponent = accuracy * 0.5; // 0-50
  const experienceComponent = Math.min(totalPredictions, 100) * 0.2; // 0-20
  const tenureComponent = Math.min(accountAgeDays, 150) * 0.1; // 0-15
  const fraudPenalty = openFraudFlags * 10;
  return Math.max(0, Math.min(100, accuracyComponent + experienceComponent + tenureComponent - fraudPenalty));
}

const computeLeaderboard = async () => {
  logger.info('Starting leaderboard computation...');
  try {
    const users = await prisma.user.findMany({ include: { predictions: true } });

    for (const user of users) {
      const totalPredictions = user.predictions.length;
      const wonPredictions = user.predictions.filter((p) => p.status === 'WON').length;
      const resolvedPredictions = user.predictions.filter((p) => p.status === 'WON' || p.status === 'LOST').length;
      const winRate = resolvedPredictions > 0 ? (wonPredictions / resolvedPredictions) * 100 : 0;

      const payouts = await prisma.transaction.aggregate({ where: { userId: user.id, type: 'PAYOUT' }, _sum: { amount: true } });
      const stakes = await prisma.transaction.aggregate({ where: { userId: user.id, type: 'BUY' }, _sum: { amount: true } });
      const profit = Number(payouts._sum.amount || 0) - Number(stakes._sum.amount || 0);

      const openFraudFlags = await prisma.fraudFlag.count({ where: { userId: user.id, status: 'OPEN' } });
      const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
      const trustScore = computeTrustScore({ accuracy: winRate, totalPredictions, accountAgeDays, openFraudFlags });

      await prisma.user.update({ where: { id: user.id }, data: { trustScore, accuracyPercentage: winRate } });

      const score = Number(user.totalBalance) + profit + user.reputationScore * 10;

      await prisma.leaderboard.upsert({
        where: { userId_leaderboardType: { userId: user.id, leaderboardType: 'GLOBAL' } },
        update: { score, winRatePercentage: winRate, totalProfit: profit, totalPredictions, rank: 1, computedAt: new Date() },
        create: { userId: user.id, leaderboardType: 'GLOBAL', score, winRatePercentage: winRate, totalProfit: profit, totalPredictions, rank: 1 },
      });
    }

    const updatedLeaderboard = await prisma.leaderboard.findMany({ where: { leaderboardType: 'GLOBAL' }, orderBy: { score: 'desc' } });
    for (let idx = 0; idx < updatedLeaderboard.length; idx++) {
      await prisma.leaderboard.update({ where: { id: updatedLeaderboard[idx].id }, data: { rank: idx + 1 } });
    }

    await cache.del('leaderboard:GLOBAL');
    eventBus.publish('LeaderboardUpdated', { leaderboardType: 'GLOBAL', computedAt: new Date() });

    logger.info('Leaderboard computation completed successfully.');
  } catch (error) {
    logger.warn('Error computing leaderboard: ' + error.message);
  }
};

let worker;
try {
  worker = new Worker(
    'leaderboardQueue',
    async (job) => {
      if (job.name === 'refresh') await computeLeaderboard();
    },
    { connection }
  );

  worker.on('error', (err) => logger.warn('Leaderboard BullMQ Worker connection issue: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize BullMQ Worker: ' + err.message);
}

module.exports = { leaderboardQueue, computeLeaderboard };
