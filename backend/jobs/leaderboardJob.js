const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

// Create a queue for leaderboard computation
const leaderboardQueue = new Queue('leaderboardQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Function to compute and save leaderboard rankings
const computeLeaderboard = async () => {
  console.log('Starting hourly leaderboard computation...');
  try {
    const users = await prisma.user.findMany({
      include: {
        predictions: true
      }
    });

    for (const user of users) {
      const totalPredictions = user.predictions.length;
      const wonPredictions = user.predictions.filter(p => p.status === 'WON').length;
      const winRate = totalPredictions > 0 ? (wonPredictions / totalPredictions) * 100 : 0;
      
      // Calculate total profit from transactions
      const payouts = await prisma.transaction.aggregate({
        where: { userId: user.id, type: 'PAYOUT' },
        _sum: { amount: true }
      });
      const stakes = await prisma.transaction.aggregate({
        where: { userId: user.id, type: 'BUY' },
        _sum: { amount: true }
      });
      const profit = Number(payouts._sum.amount || 0) - Number(stakes._sum.amount || 0);

      // Score = balance + profit + reputation
      const score = Number(user.totalBalance) + profit + (user.reputationScore * 10);

      // Upsert global type
      await prisma.leaderboard.upsert({
        where: {
          userId_leaderboardType: {
            userId: user.id,
            leaderboardType: 'GLOBAL'
          }
        },
        update: {
          score: score,
          winRatePercentage: winRate,
          totalProfit: profit,
          totalPredictions: totalPredictions,
          rank: 1, // Will resolve rank order subsequently
          computedAt: new Date()
        },
        create: {
          userId: user.id,
          leaderboardType: 'GLOBAL',
          score: score,
          winRatePercentage: winRate,
          totalProfit: profit,
          totalPredictions: totalPredictions,
          rank: 1
        }
      });
    }

    // Now recalculate actual ranks based on score descending
    const updatedLeaderboard = await prisma.leaderboard.findMany({
      where: { leaderboardType: 'GLOBAL' },
      orderBy: { score: 'desc' }
    });

    for (let idx = 0; idx < updatedLeaderboard.length; idx++) {
      await prisma.leaderboard.update({
        where: { id: updatedLeaderboard[idx].id },
        data: { rank: idx + 1 }
      });
    }

    console.log('Leaderboard computation completed successfully.');
  } catch (error) {
    console.error('Error computing leaderboard:', error);
  }
};

// Worker definition (runs in background)
let worker;
try {
  worker = new Worker('leaderboardQueue', async (job) => {
    if (job.name === 'refresh') {
      await computeLeaderboard();
    }
  }, { connection });
  
  worker.on('error', err => {
    console.warn('Leaderboard BullMQ Worker connection issue (possibly no Redis running):', err.message);
  });
} catch (err) {
  console.warn('Could not initialize BullMQ Worker:', err.message);
}

module.exports = {
  leaderboardQueue,
  computeLeaderboard
};
