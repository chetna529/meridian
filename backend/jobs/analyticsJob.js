const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const cache = require('../lib/cache');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const analyticsQueue = new Queue('analyticsQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

async function computeAnalyticsForMarket(market) {
  const now = Date.now();
  const since24h = new Date(now - 86400e3);
  const since7d = new Date(now - 7 * 86400e3);

  const [preds24h, preds7d, distinctTraders, firstOption] = await Promise.all([
    prisma.prediction.aggregate({ where: { marketId: market.id, createdAt: { gte: since24h } }, _sum: { amountStaked: true } }),
    prisma.prediction.aggregate({ where: { marketId: market.id, createdAt: { gte: since7d } }, _sum: { amountStaked: true } }),
    prisma.prediction.findMany({ where: { marketId: market.id }, select: { userId: true }, distinct: ['userId'] }),
    prisma.marketOption.findFirst({ where: { marketId: market.id }, orderBy: { createdAt: 'asc' } }),
  ]);

  let priceMove24h = 0;
  if (firstOption) {
    const [latest, dayAgo] = await Promise.all([
      prisma.marketPriceHistory.findFirst({ where: { marketId: market.id, optionId: firstOption.id }, orderBy: { recordedAt: 'desc' } }),
      prisma.marketPriceHistory.findFirst({ where: { marketId: market.id, optionId: firstOption.id, recordedAt: { lte: since24h } }, orderBy: { recordedAt: 'desc' } }),
    ]);
    if (latest && dayAgo) priceMove24h = (Number(latest.price) - Number(dayAgo.price)) * 100;
  }

  await prisma.marketAnalytics.create({
    data: {
      marketId: market.id,
      volume24h: preds24h._sum.amountStaked || 0,
      volume7d: preds7d._sum.amountStaked || 0,
      tradersCount: distinctTraders.length,
      liquidity: market.liquidityParam,
      priceMove24h,
    },
  });

  await cache.del(`market:${market.id}`);
}

async function computeAllAnalytics() {
  const markets = await prisma.market.findMany({ where: { status: { in: ['LIVE', 'LOCKED', 'RESOLVING'] } } });
  for (const market of markets) {
    await computeAnalyticsForMarket(market).catch((err) => logger.warn(`Analytics failed for market ${market.id}: ${err.message}`));
  }
  logger.info(`Computed analytics for ${markets.length} markets`);
}

let worker;
try {
  worker = new Worker(
    'analyticsQueue',
    async (job) => {
      if (job.name === 'compute') await computeAllAnalytics();
    },
    { connection }
  );
  worker.on('error', (err) => logger.warn('Analytics worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize analytics worker: ' + err.message);
}

module.exports = { analyticsQueue, computeAllAnalytics };
