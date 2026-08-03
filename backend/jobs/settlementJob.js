const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const auditLog = require('../lib/auditLog');
const lifecycle = require('../services/marketLifecycle');

const connection = require('./connection');

const settlementQueue = new Queue('settlementQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// After the dispute/review window, a LOCKED market moves to RESOLVING so it surfaces in the
// admin queue for a real, evidence-backed resolution — this never picks a winner or pays out
// automatically (see plan's resolution-engine scope note).
let worker;
try {
  worker = new Worker(
    'settlementQueue',
    async (job) => {
      if (job.name === 'finalizeLocked') {
        const disputeWindowMs = parseInt(process.env.DISPUTE_WINDOW_MINUTES || '60') * 60 * 1000;
        const cutoff = new Date(Date.now() - disputeWindowMs);
        const toResolve = await prisma.market.findMany({ where: { status: 'LOCKED', updatedAt: { lte: cutoff } } });
        for (const m of toResolve) {
          logger.info(`Moving market ${m.id} to RESOLVING for admin review`);
          lifecycle.assertTransition('LOCKED', 'RESOLVING');
          await prisma.$transaction(async (tx) => {
            await tx.market.update({ where: { id: m.id }, data: { status: 'RESOLVING' } });
            await auditLog.record(tx, { adminId: m.creatorId, action: 'AUTO_START_RESOLVING', entityType: 'Market', entityId: m.id, changes: {} });
          });
        }
      }
    },
    { connection }
  );

  worker.on('error', (err) => logger.warn('Settlement worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize settlement worker: ' + err.message);
}

module.exports = { settlementQueue };
