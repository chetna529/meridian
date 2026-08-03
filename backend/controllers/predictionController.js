const prisma = require('../lib/prisma');
const pricing = require('../lib/pricingService');
const eventBus = require('../lib/eventBus');
const walletService = require('../services/walletService');
const positionService = require('../services/positionService');
const referralService = require('../services/referralService');
const { checkBadges, addXP } = require('../lib/gamification');
const fraudService = require('../services/fraudService');

// Place a prediction, priced via LMSR (see lib/pricingService.js)
exports.placePrediction = async (req, res) => {
  try {
    const { marketId, optionId, amount } = req.body;
    const userId = req.user.userId;
    const stake = Number(amount);

    if (!stake || stake <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isEmailVerified) {
      return res.status(400).json({ error: 'Please verify your email address to place predictions.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({ where: { id: marketId }, include: { options: true } });
      if (!market || market.status !== 'LIVE') throw new Error('Market not available for trading');

      // Check if user has already placed a prediction on this market
      const existingPrediction = await tx.prediction.findFirst({
        where: {
          userId,
          marketId,
        },
      });
      if (existingPrediction) throw new Error('You have already placed a vote on this market');

      const orderedOptions = [...market.options].sort((a, b) => a.createdAt - b.createdAt);
      const optionIndex = orderedOptions.findIndex((o) => o.id === optionId);
      if (optionIndex === -1) throw new Error('Invalid option');
      const option = orderedOptions[optionIndex];

      const b = Number(market.liquidityParam);
      const qBefore = orderedOptions.map((o) => Number(o.sharesOutstanding));
      const shares = pricing.sharesForBudget(qBefore, optionIndex, stake, b);
      if (!shares || shares <= 0) throw new Error('Trade too small to price');

      const { user: userAfterDebit } = await walletService.debit(tx, {
        userId,
        subType: 'PREDICTION_STAKE',
        amount: stake,
        metadata: { marketId, optionId },
      });

      await tx.user.update({ where: { id: userId }, data: { investedBalance: { increment: stake } } });

      await tx.marketOption.update({
        where: { id: optionId },
        data: {
          totalStaked: { increment: stake },
          sharesOutstanding: { increment: shares },
          predictionCount: { increment: 1 },
        },
      });

      const qAfter = [...qBefore];
      qAfter[optionIndex] += shares;
      const pricesAfter = pricing.price(qAfter, b);

      for (let i = 0; i < orderedOptions.length; i++) {
        await tx.marketOption.update({
          where: { id: orderedOptions[i].id },
          data: { currentOdds: pricesAfter[i] * 100 },
        });
        await tx.marketPriceHistory.create({
          data: { marketId, optionId: orderedOptions[i].id, price: pricesAfter[i] },
        });
      }

      const yesIdx = orderedOptions.findIndex((o) => o.optionText.toUpperCase().includes('YES'));
      const noIdx = orderedOptions.findIndex((o) => o.optionText.toUpperCase().includes('NO'));
      const yesPercentage = yesIdx !== -1 ? pricesAfter[yesIdx] * 100 : 50;
      const noPercentage = noIdx !== -1 ? pricesAfter[noIdx] * 100 : 50;

      const updatedMarket = await tx.market.update({
        where: { id: marketId },
        data: { totalVolume: { increment: stake }, totalPredictions: { increment: 1 }, yesPercentage, noPercentage },
      });

      const prediction = await tx.prediction.create({
        data: { userId, marketId, optionId, amountStaked: stake, potentialReturn: shares, status: 'PENDING' },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'BUY',
          amount: stake,
          reason: `Placed prediction on market: ${market.title}`,
          marketId,
          balanceAfter: Number(userAfterDebit.totalBalance),
        },
      });

      await positionService.upsertPositionOnTrade(tx, {
        userId,
        marketId,
        optionId,
        shares,
        cost: stake,
        entryPrice: stake / shares,
      });

      await addXP(tx, userId, 10);
      await checkBadges(tx, userId);
      await referralService.completeReferralOnFirstTrade(tx, userId);

      const user = await tx.user.findUnique({ where: { id: userId } });

      return {
        prediction,
        yesPercentage,
        noPercentage,
        totalVolume: updatedMarket.totalVolume,
        userBalance: user.totalBalance,
        optionText: option.optionText,
        prices: orderedOptions.reduce((acc, o, i) => ({ ...acc, [o.id]: pricesAfter[i] }), {}),
      };
    }, { timeout: 15000, maxWait: 10000 });

    const io = req.app.get('io');
    if (io) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      eventBus.publish('PredictionPlaced', {
        marketId,
        userId,
        username: user?.username,
        optionText: result.optionText,
        prices: result.prices,
        totalVolume: Number(result.totalVolume),
        sentiment: result.yesPercentage > 50 ? 'BULLISH' : 'BEARISH',
      });
    }

    fraudService.checkTrade({ userId, marketId, optionId, amount: stake }).catch((err) => console.error('Fraud check failed:', err));

    res.status(201).json(result);
  } catch (error) {
    console.error('Error placing prediction:', error);
    res.status(400).json({ error: error.message || 'Failed to place prediction' });
  }
};

// Get user predictions
exports.getUserPredictions = async (req, res) => {
  try {
    const predictions = await prisma.prediction.findMany({
      where: { userId: req.user.userId },
      include: {
        market: true,
        option: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};
