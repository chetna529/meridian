const walletService = require('../services/walletService');
const eventBus = require('./eventBus');

const LEVEL_THRESHOLDS = [
  { level: 4, xp: 5000, name: 'Market Oracle' },
  { level: 3, xp: 2000, name: 'Expert Forecaster' },
  { level: 2, xp: 500, name: 'Apprentice Analyst' },
];
const LEVEL_UP_BONUS = 500;

async function notify(tx, { userId, type, title, message, data }) {
  const notification = await tx.notification.create({ data: { userId, type, title, message, data } });
  eventBus.publish('NotificationCreated', { ...notification, userId }).catch(() => {});
  return notification;
}

// Add XP points and handle level-ups (this is the only path that should mutate xpPoints/level).
async function addXP(tx, userId, xpAmount) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { xpPoints: { increment: xpAmount } },
  });

  const nextLevel = LEVEL_THRESHOLDS.find((t) => updatedUser.xpPoints >= t.xp && t.level > user.level);
  if (nextLevel) {
    await tx.user.update({ where: { id: userId }, data: { level: nextLevel.level } });
    await walletService.credit(tx, {
      userId,
      subType: 'LEVEL_UP_BONUS',
      amount: LEVEL_UP_BONUS,
      metadata: { level: nextLevel.level },
    });

    await notify(tx, {
      userId,
      type: 'LEVEL_UP',
      title: 'Level Up! 🎉',
      message: `You reached Level ${nextLevel.level} (${nextLevel.name}) and earned a ${LEVEL_UP_BONUS} point bonus!`,
    });
  }
}

// Check for and award badges
async function checkBadges(tx, userId) {
  try {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        predictions: {
          include: { market: true },
        },
      },
    });

    if (!user) return;

    const totalPredictions = user.predictions.length;
    const wonPredictions = user.predictions.filter((p) => p.status === 'WON');
    const lostPredictions = user.predictions.filter((p) => p.status === 'LOST');

    const getBadgeId = async (badgeType, displayName, description) => {
      let b = await tx.badge.findUnique({ where: { badgeType } });
      if (!b) {
        b = await tx.badge.create({ data: { badgeType, displayName, description } });
      }
      return b.id;
    };

    // 1. Early Adopter (awarded to everyone who has registered)
    const earlyBadgeId = await getBadgeId('EARLY_ADOPTER', 'Early Adopter', 'Joined Meridian in its early stages');
    await awardBadge(tx, userId, earlyBadgeId, 'Early Adopter');

    // 2. First Prediction
    if (totalPredictions >= 1) {
      const badgeId = await getBadgeId('FIRST_PREDICTION', 'First Prediction', 'Placed your first prediction');
      await awardBadge(tx, userId, badgeId, 'First Prediction');
    }

    // 3. Beginner's Luck
    if (wonPredictions.length >= 1) {
      const badgeId = await getBadgeId('BEGINNERS_LUCK', "Beginner's Luck", 'Won your first prediction');
      await awardBadge(tx, userId, badgeId, "Beginner's Luck");
    }

    // 4. 5-Win Streak
    const sortedPredictions = [...user.predictions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let currentStreak = 0;
    let maxStreak = 0;
    for (const pred of sortedPredictions) {
      if (pred.status === 'WON') {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else if (pred.status === 'LOST') {
        currentStreak = 0;
      }
    }
    if (maxStreak >= 5) {
      const badgeId = await getBadgeId('WIN_STREAK_5', '5-Win Streak', 'Won 5 predictions in a row');
      await awardBadge(tx, userId, badgeId, '5-Win Streak');
    }

    // 5. ₹1,000 Profit Club
    const totalWinnings = wonPredictions.reduce((sum, p) => sum + (Number(p.potentialReturn || 0) - Number(p.amountStaked || 0)), 0);
    const totalLosses = lostPredictions.reduce((sum, p) => sum + Number(p.amountStaked || 0), 0);
    const netProfit = totalWinnings - totalLosses;
    if (netProfit >= 1000) {
      const badgeId = await getBadgeId('PROFIT_CLUB_1000', '₹1,000 Profit Club', 'Made ₹1,000 or more in profit');
      await awardBadge(tx, userId, badgeId, '₹1,000 Profit Club');
    }

    // 6. Top Predictor
    const accuracy = totalPredictions >= 5 ? (wonPredictions.length / totalPredictions) * 100 : 0;
    if (totalPredictions >= 10 && accuracy >= 80) {
      const badgeId = await getBadgeId('TOP_PREDICTOR', 'Top Predictor', 'Maintained 80%+ accuracy with 10+ predictions');
      await awardBadge(tx, userId, badgeId, 'Top Predictor');
    }

    // 7. Diversified
    const categories = new Set(user.predictions.map((p) => p.market.category));
    if (categories.size >= 3) {
      const badgeId = await getBadgeId('DIVERSIFIED', 'Diversified', 'Predicted in 3 or more distinct categories');
      await awardBadge(tx, userId, badgeId, 'Diversified');
    }

    // 8. Sharpshooter
    if (wonPredictions.length >= 10) {
      const badgeId = await getBadgeId('SHARPSHOOTER', 'Sharpshooter', 'Won 10 or more predictions');
      await awardBadge(tx, userId, badgeId, 'Sharpshooter');
    }

    // 9. Veteran Trader
    if (totalPredictions >= 25) {
      const badgeId = await getBadgeId('VETERAN_TRADER', 'Veteran Trader', 'Placed 25 or more predictions');
      await awardBadge(tx, userId, badgeId, 'Veteran Trader');
    }

    // 10. Market Prophet
    if (totalPredictions >= 5 && accuracy >= 75) {
      const badgeId = await getBadgeId('MARKET_PROPHET', 'Market Prophet', 'Maintained 75%+ accuracy over 5+ predictions');
      await awardBadge(tx, userId, badgeId, 'Market Prophet');
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

async function awardBadge(tx, userId, badgeId, badgeName) {
  const existing = await tx.badgeEarned.findUnique({
    where: { userId_badgeId: { userId, badgeId } },
  });

  if (!existing) {
    await tx.badgeEarned.create({ data: { userId, badgeId } });
    await notify(tx, {
      userId,
      type: 'BADGE_EARNED',
      title: 'Badge Earned! 🏆',
      message: `Congratulations! You earned the "${badgeName}" badge!`,
    });
  }
}

module.exports = {
  addXP,
  checkBadges,
  notify,
};
