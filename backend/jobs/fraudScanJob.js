const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const fraudService = require('../services/fraudService');

const connection = require('./connection');

const fraudQueue = new Queue('fraudQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Broader periodic sweep, complementing the inline per-trade check in fraudService.checkTrade.
async function scanForVolumeSpikes() {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const recentPredictions = await prisma.prediction.findMany({
    where: { createdAt: { gte: since } },
    select: { userId: true, marketId: true, optionId: true, amountStaked: true },
  });

  for (const pred of recentPredictions) {
    await fraudService.checkTrade({
      userId: pred.userId,
      marketId: pred.marketId,
      optionId: pred.optionId,
      amount: Number(pred.amountStaked),
    }).catch((err) => logger.warn('Fraud scan check failed: ' + err.message));
  }
}

let worker;
try {
  worker = new Worker(
    'fraudQueue',
    async (job) => {
      if (job.name === 'scan') await scanForVolumeSpikes();
    },
    { connection }
  );
  worker.on('error', (err) => logger.warn('Fraud scan worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize fraud scan worker: ' + err.message);
}

module.exports = { fraudQueue, scanForVolumeSpikes };
