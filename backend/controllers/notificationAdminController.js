const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditLog = require('../lib/auditLog');
const { broadcastQueue, sendBroadcast } = require('../jobs/notificationBroadcastJob');

exports.listBroadcasts = async (req, res) => {
  try {
    const broadcasts = await prisma.notificationBroadcast.findMany({
      include: { createdBy: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(broadcasts);
  } catch (error) {
    console.error('Error listing broadcasts:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};

exports.createBroadcast = async (req, res) => {
  try {
    const { title, message, target, targetUserId, scheduledFor } = req.body;
    if (!title || !message || !['ALL', 'SPECIFIC_USER'].includes(target)) {
      return res.status(400).json({ error: 'title, message, and a valid target are required' });
    }
    if (target === 'SPECIFIC_USER' && !targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required when target is SPECIFIC_USER' });
    }

    const sendAt = scheduledFor ? new Date(scheduledFor) : null;
    const isFuture = sendAt && sendAt.getTime() > Date.now() + 5000; // small buffer to avoid racing "now"

    const broadcast = await prisma.$transaction(async (tx) => {
      const created = await tx.notificationBroadcast.create({
        data: {
          title,
          message,
          target,
          targetUserId: target === 'SPECIFIC_USER' ? targetUserId : null,
          createdById: req.user.userId,
          scheduledFor: sendAt,
          status: 'SCHEDULED',
        },
      });
      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'CREATE_NOTIFICATION_BROADCAST',
        entityType: 'NotificationBroadcast',
        entityId: created.id,
        changes: { title, target, scheduledFor: sendAt },
      });
      return created;
    });

    if (isFuture) {
      await broadcastQueue.add('send', { broadcastId: broadcast.id }, { delay: sendAt.getTime() - Date.now() });
      return res.status(201).json(broadcast);
    }

    await sendBroadcast(broadcast.id);
    const sent = await prisma.notificationBroadcast.findUnique({ where: { id: broadcast.id } });
    res.status(201).json(sent);
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

exports.cancelBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await prisma.notificationBroadcast.findUnique({ where: { id } });
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });
    if (broadcast.status !== 'SCHEDULED') return res.status(400).json({ error: 'Only scheduled broadcasts can be cancelled' });

    await prisma.notificationBroadcast.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ message: 'Broadcast cancelled' });
  } catch (error) {
    console.error('Error cancelling broadcast:', error);
    res.status(500).json({ error: 'Failed to cancel broadcast' });
  }
};
