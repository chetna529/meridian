const crypto = require('crypto');
const walletService = require('./walletService');

const REFERRAL_REWARD = 250;

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function createReferralIfCodeProvided(tx, { refereeId, code }) {
  if (!code) return null;
  const referrer = await tx.user.findUnique({ where: { referralCode: code } });
  if (!referrer || referrer.id === refereeId) return null;

  return tx.referral.create({ data: { referrerId: referrer.id, refereeId, code } });
}

// Called on a referee's first funded trade. Pays both sides once; idempotent.
async function completeReferralOnFirstTrade(tx, userId) {
  const referral = await tx.referral.findUnique({ where: { refereeId: userId } });
  if (!referral || referral.status === 'COMPLETED') return;

  await walletService.credit(tx, {
    userId: referral.referrerId,
    subType: 'REFERRAL_BONUS',
    amount: REFERRAL_REWARD,
    referenceId: referral.id,
    metadata: { role: 'referrer', refereeId: userId },
  });
  await walletService.credit(tx, {
    userId: referral.refereeId,
    subType: 'REFERRAL_BONUS',
    amount: REFERRAL_REWARD,
    referenceId: referral.id,
    metadata: { role: 'referee' },
  });

  await tx.referral.update({
    where: { id: referral.id },
    data: { status: 'COMPLETED', rewardAmount: REFERRAL_REWARD, completedAt: new Date() },
  });

  await tx.notification.create({
    data: {
      userId: referral.referrerId,
      type: 'REFERRAL_BONUS',
      title: 'Referral bonus! 🎁',
      message: `Your referral just placed their first prediction — you earned ${REFERRAL_REWARD} points!`,
    },
  });
}

module.exports = { generateReferralCode, createReferralIfCodeProvided, completeReferralOnFirstTrade, REFERRAL_REWARD };
