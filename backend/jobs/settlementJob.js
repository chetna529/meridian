const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const settlementQueue = new Queue('settlementQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Worker to finalize locked markets after dispute window
let worker;
try {
  worker = new Worker('settlementQueue', async (job) => {
    if (job.name === 'finalizeLocked') {
      const disputeWindowMs = (parseInt(process.env.DISPUTE_WINDOW_MINUTES || '60')) * 60 * 1000;
      const cutoff = new Date(Date.now() - disputeWindowMs);
      const toFinalize = await prisma.market.findMany({ where: { status: 'LOCKED', updatedAt: { lte: cutoff } }, include: { options: true } });
      for (const m of toFinalize) {
        logger.info(`Auto-finalizing market ${m.id}`);
        // choose winner by highest totalStaked
        const options = await prisma.marketOption.findMany({ where: { marketId: m.id } });
        const winner = options.reduce((a, b) => (Number(a.totalStaked) > Number(b.totalStaked) ? a : b));
        if (!winner) continue;
        await prisma.$transaction(async (tx) => {
          await tx.market.update({ where: { id: m.id }, data: { status: 'RESOLVED', resolvedDate: new Date() } });

          const winningPreds = await tx.prediction.findMany({ where: { marketId: m.id, optionId: winner.id, status: 'PENDING' } });
          for (const pred of winningPreds) {
            const payout = Number(pred.potentialReturn || 0);
            await tx.user.update({ where: { id: pred.userId }, data: { totalBalance: { increment: payout } } });
            await tx.prediction.update({ where: { id: pred.id }, data: { status: 'WON', resolvedAt: new Date() } });
            await tx.transaction.create({ data: { userId: pred.userId, type: 'PAYOUT', amount: payout, reason: `Auto payout ${m.title}`, marketId: m.id, balanceAfter: payout } });
            await tx.walletLedger.create({ data: { userId: pred.userId, type: 'CREDIT', subType: 'PAYOUT', amount: payout, balanceBefore: 0, balanceAfter: payout, referenceId: pred.id, metadata: { marketId: m.id } } });
          }

          await tx.prediction.updateMany({ where: { marketId: m.id, status: 'PENDING', optionId: { not: winner.id } }, data: { status: 'LOST', resolvedAt: new Date() } });
        });
      }
    }
  }, { connection });

  worker.on('error', err => logger.warn('Settlement worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize settlement worker: ' + err.message);
}

module.exports = { settlementQueue };
