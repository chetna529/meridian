const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastToFollowers } = require('../websocket/handler');
const { checkBadges } = require('../lib/gamification');

// Place a prediction (with Dynamic Odds AMM)
exports.placePrediction = async (req, res) => {
  try {
    const { marketId, optionId, amount } = req.body;
    const userId = req.user.userId;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      const market = await tx.market.findUnique({ where: { id: marketId }, include: { options: true } });
      const option = market?.options.find(o => o.id === optionId);

      if (!user || Number(user.totalBalance) < Number(amount)) throw new Error('Insufficient balance');
      if (!market || market.status !== 'LIVE') throw new Error('Market not available');
      if (!option) throw new Error('Invalid option');

      // Update user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          totalBalance: { decrement: amount },
          investedBalance: { increment: amount },
          xpPoints: { increment: 10 }
        }
      });

      // Level calculation logic
      let newLevel = updatedUser.level;
      if (updatedUser.xpPoints >= 5000) newLevel = 4;
      else if (updatedUser.xpPoints >= 2000) newLevel = 3;
      else if (updatedUser.xpPoints >= 500) newLevel = 2;

      if (newLevel > updatedUser.level) {
        await tx.user.update({
          where: { id: userId },
          data: { level: newLevel, totalBalance: { increment: 500 } }
        });
        
        await tx.notification.create({
          data: {
            userId,
            type: 'LEVEL_UP',
            title: 'Level Up! 🎉',
            message: `You reached Level ${newLevel} and earned a 500 point bonus!`
          }
        });
      }

      // Update option
      await tx.marketOption.update({
        where: { id: optionId },
        data: {
          totalStaked: { increment: amount },
          predictionCount: { increment: 1 }
        }
      });

      // Recalculate odds (Simple AMM logic based on total staked proportions)
      const optionsAfter = await tx.marketOption.findMany({ where: { marketId } });
      const totalPool = optionsAfter.reduce((sum, opt) => sum + Number(opt.totalStaked), 0);
      
      let yesPercentage = 50, noPercentage = 50;
      if (totalPool > 0) {
        // Find the first option (typically YES) and the second (typically NO)
        const opt1 = optionsAfter[0];
        const opt2 = optionsAfter[1];
        if (opt1 && opt2) {
          const opt1Perc = (Number(opt1.totalStaked) / totalPool) * 100;
          const opt2Perc = (Number(opt2.totalStaked) / totalPool) * 100;
          
          if (opt1.optionText.toUpperCase().includes('YES')) {
            yesPercentage = opt1Perc;
            noPercentage = opt2Perc;
          } else {
            yesPercentage = opt2Perc;
            noPercentage = opt1Perc;
          }
        }
      }

      // Update market
      await tx.market.update({
        where: { id: marketId },
        data: {
          totalVolume: { increment: amount },
          totalPredictions: { increment: 1 },
          yesPercentage,
          noPercentage
        }
      });

      // Calculate AMM-based potential return using pricing service
      const pricing = require('../lib/pricingService');
      const optionsAfterTotals = optionsAfter.map(o => Number(o.totalStaked));
      const totalPoolAfter = optionsAfterTotals.reduce((s, v) => s + v, 0);
      const optionTotal = Number(option.totalStaked) + Number(amount);
      const multiplier = pricing.computeMultiplier(totalPoolAfter, optionTotal);

      const prediction = await tx.prediction.create({
        data: {
          userId,
          marketId,
          optionId,
          amountStaked: amount,
          potentialReturn: amount * multiplier,
          status: 'PENDING'
        }
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'BUY',
          amount,
          reason: `Placed prediction on market: ${market.title}`,
          marketId,
          balanceAfter: Number(updatedUser.totalBalance)
        }
      });

      // Create wallet ledger entry for audit-grade balance tracking
      await tx.walletLedger.create({
        data: {
          userId,
          type: 'DEBIT',
          subType: 'PREDICTION_STAKE',
          amount,
          balanceBefore: user.totalBalance,
          balanceAfter: Number(updatedUser.totalBalance),
          referenceId: '',
          metadata: { marketId, optionId }
        }
      });

      // Create a Position record to track user's open position
      await tx.position.create({
        data: {
          userId,
          marketId,
          optionId,
          shares: amount,
          entryPrice: Number(multiplier),
        }
      });

      // Gamification check
      await checkBadges(tx, userId);

      // Returning data out of transaction
      return { prediction, userBalance: updatedUser.totalBalance, yesPercentage, noPercentage, totalVolume: market.totalVolume + amount };
    });

    // EMIT SOCKET EVENT for real-time updates!
    const io = req.app.get('io');
    if (io) {
      // Broadcast to specific market room
      io.to(`market:${marketId}`).emit('odds-updated', {
        marketId: marketId,
        yesPercentage: result.yesPercentage,
        noPercentage: result.noPercentage,
        totalVolume: Number(result.totalVolume),
        sentiment: result.yesPercentage > 50 ? 'BULLISH' : 'BEARISH'
      });

      // Broadcast user's prediction to followers
      prisma.user.findUnique({ where: { id: userId } }).then(user => {
        if (user) {
          broadcastToFollowers(io, userId, {
            username: user.username,
            marketId: marketId,
            prediction: result.prediction.potentialReturn ? 'YES' : 'NO' // simplified logic
          });
        }
      }).catch(err => console.error(err));
    }

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
        option: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
};
