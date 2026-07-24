const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const auditLog = require('../lib/auditLog');
const cache = require('../lib/cache');
const lifecycle = require('../services/marketLifecycle');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const marketPublishQueue = new Queue('marketPublishQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

async function publishScheduledMarket(marketId, adminId) {
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market || !lifecycle.canTransition(market.status, 'LIVE')) return; // already published/cancelled — no-op

  await prisma.$transaction(async (tx) => {
    await tx.market.update({ where: { id: marketId }, data: { status: 'LIVE' } });
    await auditLog.record(tx, { adminId, action: 'SCHEDULED_PUBLISH_MARKET', entityType: 'Market', entityId: marketId, changes: {} });
  });
  await cache.del(`market:${marketId}`);
}

let worker;
try {
  worker = new Worker(
    'marketPublishQueue',
    async (job) => {
      if (job.name === 'publish') await publishScheduledMarket(job.data.marketId, job.data.adminId);
    },
    { connection }
  );
  worker.on('error', (err) => logger.warn('Market publish worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize market publish worker: ' + err.message);
}

module.exports = { marketPublishQueue, publishScheduledMarket };
