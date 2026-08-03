const prisma = require('../lib/prisma');
const { addXP } = require('../lib/gamification');

// Get user's daily challenges
exports.getDailyChallenges = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch user details to calculate activity metrics
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        predictions: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        },
        comments: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mock challenges evaluated dynamically based on daily DB records
    const challenges = [
      {
        id: 'challenge_1',
        title: 'Predictor Debut',
        description: 'Place at least 1 prediction today',
        xpReward: 100,
        progress: user.predictions.length >= 1 ? 1 : 0,
        target: 1,
        completed: user.predictions.length >= 1
      },
      {
        id: 'challenge_2',
        title: 'Active Talker',
        description: 'Post at least 1 comment on any market',
        xpReward: 50,
        progress: user.comments.length >= 1 ? 1 : 0,
        target: 1,
        completed: user.comments.length >= 1
      }
    ];

    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
};

// Claim reward for a completed challenge
exports.claimReward = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user.userId;

    // Check if reward was already claimed today
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'CHALLENGE_CLAIMED',
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        },
        message: {
          contains: challengeId
        }
      }
    });

    if (existingNotification) {
      return res.status(400).json({ error: 'Challenge reward already claimed today' });
    }

    // Award XP
    let xpAwarded = challengeId === 'challenge_1' ? 100 : 50;
    await prisma.$transaction(async (tx) => {
      await addXP(tx, userId, xpAwarded);
      await tx.notification.create({
        data: {
          userId,
          type: 'CHALLENGE_CLAIMED',
          title: 'Challenge Completed! 🎯',
          message: `Claimed reward for ${challengeId}: +${xpAwarded} XP!`
        }
      });
    });

    res.json({ success: true, message: `Successfully claimed ${xpAwarded} XP!` });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ error: 'Failed to claim challenge reward' });
  }
};
