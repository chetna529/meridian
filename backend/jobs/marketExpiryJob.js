const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const eventBus = require('../lib/eventBus');
const auditLog = require('../lib/auditLog');
const logger = require('../lib/logger');

const connection = require('./connection');

const marketExpiryQueue = new Queue('marketExpiryQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Locks markets whose resolutionDate has passed, then hands them to the settlement queue,
// which — after a grace period — moves them to RESOLVING for an admin to resolve with evidence.
// Nothing here auto-picks a winner; see jobs/settlementJob.js.
let worker;
try {
  worker = new Worker(
    'marketExpiryQueue',
    async (job) => {
      if (job.name === 'checkExpiry') {
        const now = new Date();
        const toLock = await prisma.market.findMany({ where: { status: 'LIVE', resolutionDate: { lte: now } } });
        for (const m of toLock) {
          await prisma.$transaction(async (tx) => {
            await tx.market.update({ where: { id: m.id }, data: { status: 'LOCKED' } });
            await auditLog.record(tx, { adminId: m.creatorId, action: 'AUTO_LOCK_MARKET', entityType: 'Market', entityId: m.id, changes: { reason: 'resolutionDate passed' } });
          });
          eventBus.publish('MarketLocked', { marketId: m.id, title: m.title });
          try {
            const { settlementQueue } = require('./settlementJob');
            await settlementQueue.add('finalizeLocked', { marketId: m.id });
          } catch (e) {
            logger.warn('Could not enqueue settlement job: ' + e.message);
          }
        }
      }
    },
    { connection }
  );

  worker.on('error', (err) => logger.warn('Market expiry worker issue: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize marketExpiry worker: ' + err.message);
}

module.exports = { marketExpiryQueue };
