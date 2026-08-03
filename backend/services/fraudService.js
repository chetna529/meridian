// Rule-based fraud heuristics (not ML — see plan's explicit scope note). Runs inline after a
// trade for fast-signal checks, and periodically via jobs/fraudScanJob.js for broader sweeps.

const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const RAPID_FIRE_WINDOW_MS = 60 * 1000;
const RAPID_FIRE_THRESHOLD = 8; // trades/minute from one user
const WASH_TRADE_WINDOW_MS = 5 * 60 * 1000;
const VOLUME_SPIKE_RATIO = 0.4; // a single trade making up >40% of a market's rolling volume

async function flag({ userId, marketId, type, severity, details }) {
  const existing = await prisma.fraudFlag.findFirst({
    where: { userId, marketId, type, status: 'OPEN' },
  });
  if (existing) return existing;

  logger.warn(`Fraud flag raised: ${type} for user ${userId} on market ${marketId}`);
  return prisma.fraudFlag.create({ data: { userId, marketId, type, severity, details } });
}

async function checkTrade({ userId, marketId, optionId, amount }) {
  const since = new Date(Date.now() - RAPID_FIRE_WINDOW_MS);
  const recentCount = await prisma.prediction.count({ where: { userId, createdAt: { gte: since } } });
  if (recentCount >= RAPID_FIRE_THRESHOLD) {
    await flag({
      userId,
      marketId,
      type: 'RAPID_FIRE',
      severity: recentCount >= RAPID_FIRE_THRESHOLD * 2 ? 3 : 2,
      details: { tradesInWindow: recentCount, windowMs: RAPID_FIRE_WINDOW_MS },
    });
  }

  const washSince = new Date(Date.now() - WASH_TRADE_WINDOW_MS);
  const recentOpposing = await prisma.prediction.findMany({
    where: { userId, marketId, createdAt: { gte: washSince }, optionId: { not: optionId } },
    select: { id: true, optionId: true, amountStaked: true },
  });
  if (recentOpposing.length > 0) {
    await flag({
      userId,
      marketId,
      type: 'WASH_TRADING',
      severity: 2,
      details: { opposingTrades: recentOpposing.length, windowMs: WASH_TRADE_WINDOW_MS },
    });
  }

  const market = await prisma.market.findUnique({ where: { id: marketId }, select: { totalVolume: true } });
  const totalVolume = Number(market?.totalVolume || 0);
  if (totalVolume > 0 && amount / totalVolume > VOLUME_SPIKE_RATIO && amount > 500) {
    await flag({
      userId,
      marketId,
      type: 'VOLUME_SPIKE',
      severity: 2,
      details: { tradeAmount: amount, marketVolume: totalVolume, ratio: amount / totalVolume },
    });
  }
}

module.exports = { checkTrade, flag };
