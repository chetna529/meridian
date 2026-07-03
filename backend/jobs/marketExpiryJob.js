const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const marketExpiryQueue = new Queue('marketExpiryQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

// Worker to lock markets whose resolutionDate has passed
let worker;
try {
  worker = new Worker('marketExpiryQueue', async (job) => {
    if (job.name === 'checkExpiry') {
      const now = new Date();
      const toLock = await prisma.market.findMany({ where: { status: 'LIVE', resolutionDate: { lte: now } } });
      for (const m of toLock) {
        await prisma.market.update({ where: { id: m.id }, data: { status: 'LOCKED' } });
        try {
          const { settlementQueue } = require('./settlementJob');
          await settlementQueue.add('finalizeLocked', { marketId: m.id });
        } catch (e) {
          console.warn('Could not enqueue settlement job:', e.message);
        }
      }
    }
  }, { connection });

  worker.on('error', err => {
    console.warn('Market expiry worker issue:', err.message);
  });
} catch (err) {
  console.warn('Could not initialize marketExpiry worker:', err.message);
}

module.exports = { marketExpiryQueue };
