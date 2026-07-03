const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Add XP points and handle levels
async function addXP(tx, userId, xpAmount) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      xpPoints: { increment: xpAmount }
    }
  });

  let newLevel = updatedUser.level;
  if (updatedUser.xpPoints >= 5000) newLevel = 4; // Market Oracle
  else if (updatedUser.xpPoints >= 2000) newLevel = 3; // Expert Forecaster
  else if (updatedUser.xpPoints >= 500) newLevel = 2; // Apprentice Analyst

  if (newLevel > user.level) {
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
}

// Check for and award badges
async function checkBadges(tx, userId) {
  try {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        predictions: {
          include: { market: true }
        }
      }
    });

    if (!user) return;

    const totalPredictions = user.predictions.length;
    const wonPredictions = user.predictions.filter(p => p.status === 'WON');
    
    // Helper to get or create a badge
    const getBadgeId = async (badgeType, displayName, description) => {
      let b = await tx.badge.findUnique({ where: { badgeType } });
      if (!b) {
        b = await tx.badge.create({
          data: { badgeType, displayName, description }
        });
      }
      return b.id;
    };

    // 1. Bronze: First Prediction
    if (totalPredictions >= 1) {
      const badgeId = await getBadgeId('FIRST_PREDICTION', 'First Prediction', 'Placed your first prediction');
      await awardBadge(tx, userId, badgeId, 'First Prediction');
    }

    // 2. Bronze: Beginner's Luck
    if (wonPredictions.length >= 1) {
      const badgeId = await getBadgeId('BEGINNERS_LUCK', "Beginner's Luck", 'Won your first prediction');
      await awardBadge(tx, userId, badgeId, "Beginner's Luck");
    }

    // 3. Silver: Diversified (predictions in 3+ categories)
    const categories = new Set(user.predictions.map(p => p.market.category));
    if (categories.size >= 3) {
      const badgeId = await getBadgeId('DIVERSIFIED', 'Diversified', 'Predicted in 3 or more distinct categories');
      await awardBadge(tx, userId, badgeId, 'Diversified');
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

async function awardBadge(tx, userId, badgeId, badgeName) {
  const existing = await tx.badgeEarned.findUnique({
    where: {
      userId_badgeId: { userId, badgeId }
    }
  });

  if (!existing) {
    await tx.badgeEarned.create({
      data: { userId, badgeId }
    });

    await tx.notification.create({
      data: {
        userId,
        type: 'BADGE_EARNED',
        title: 'Badge Earned! 🏆',
        message: `Congratulations! You earned the "${badgeName}" badge!`
      }
    });
  }
}

module.exports = {
  addXP,
  checkBadges
};
