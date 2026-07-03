const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getMyPositions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const positions = await prisma.position.findMany({ where: { userId }, include: { market: true } });
    res.json(positions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
};
