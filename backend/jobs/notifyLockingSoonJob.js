const { Queue, Worker } = require('bullmq');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const eventBus = require('../lib/eventBus');

const connection = require('./connection');

const notifyLockingSoonQueue = new Queue('notifyLockingSoonQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Warns participants ~1h before a LIVE market locks. Uses Notification.data to avoid re-notifying.
let worker;
try {
  worker = new Worker(
    'notifyLockingSoonQueue',
    async (job) => {
      if (job.name !== 'check') return;
      const now = Date.now();
      const windowStart = new Date(now + 55 * 60 * 1000);
      const windowEnd = new Date(now + 65 * 60 * 1000);

      const markets = await prisma.market.findMany({
        where: { status: 'LIVE', resolutionDate: { gte: windowStart, lte: windowEnd } },
      });

      for (const market of markets) {
        const participants = await prisma.prediction.findMany({ where: { marketId: market.id }, select: { userId: true }, distinct: ['userId'] });
        for (const { userId } of participants) {
          const already = await prisma.notification.findFirst({
            where: { userId, type: 'MARKET_LOCKING_SOON', data: { path: ['marketId'], equals: market.id } },
          });
          if (already) continue;

          const notification = await prisma.notification.create({
            data: {
              userId,
              type: 'MARKET_LOCKING_SOON',
              title: 'Market closing soon',
              message: `${market.title} locks in about an hour.`,
              data: { marketId: market.id },
            },
          });
          eventBus.publish('NotificationCreated', { ...notification, userId });
        }
      }
    },
    { connection }
  );
  worker.on('error', (err) => logger.warn('Locking-soon worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize locking-soon worker: ' + err.message);
}

module.exports = { notifyLockingSoonQueue };
