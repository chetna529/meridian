const prisma = require('../lib/prisma');

exports.getNotifications = async (req, res) => {
  try {
    const { cursor, take } = req.query;
    const pageSize = Math.min(Number(take) || 20, 100);

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, readAt: null },
      data: { readAt: new Date() }
    });
    res.json({ message: 'Marked all as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};
