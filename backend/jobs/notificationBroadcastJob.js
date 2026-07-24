const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const eventBus = require('../lib/eventBus');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const broadcastQueue = new Queue('broadcastQueue', { connection, defaultJobOptions: { removeOnComplete: true, removeOnFail: true } });

async function sendBroadcast(broadcastId) {
  const broadcast = await prisma.notificationBroadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast || broadcast.status !== 'SCHEDULED') return; // cancelled or already sent

  const targetUserIds =
    broadcast.target === 'SPECIFIC_USER' && broadcast.targetUserId
      ? [broadcast.targetUserId]
      : (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id);

  for (const userId of targetUserIds) {
    const notification = await prisma.notification.create({
      data: { userId, type: 'ADMIN_BROADCAST', title: broadcast.title, message: broadcast.message, data: { broadcastId } },
    });
    eventBus.publish('NotificationCreated', { ...notification, userId }).catch(() => {});
  }

  await prisma.notificationBroadcast.update({
    where: { id: broadcastId },
    data: { status: 'SENT', sentAt: new Date(), recipientCount: targetUserIds.length },
  });
}

let worker;
try {
  worker = new Worker(
    'broadcastQueue',
    async (job) => {
      if (job.name === 'send') await sendBroadcast(job.data.broadcastId);
    },
    { connection }
  );
  worker.on('error', (err) => logger.warn('Broadcast worker error: ' + err.message));
} catch (err) {
  logger.warn('Could not initialize broadcast worker: ' + err.message);
}

module.exports = { broadcastQueue, sendBroadcast };
