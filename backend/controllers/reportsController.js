const prisma = require('../lib/prisma');
const { toCsv } = require('../lib/csv');

// GET /api/admin/reports/summary — growth, revenue-equivalent, market performance
exports.getSummary = async (req, res) => {
  try {
    const signupRows = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC
    `;
    const volumeRows = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("amountStaked"), 0) AS volume
      FROM "Prediction" WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC
    `;

    const [stakesAgg, payoutsAgg, topMarkets, resolvedCount, disputedCount] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'BUY' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'PAYOUT' }, _sum: { amount: true } }),
      prisma.market.findMany({ orderBy: { totalVolume: 'desc' }, take: 5, select: { id: true, title: true, totalVolume: true, category: true, status: true } }),
      prisma.market.count({ where: { status: 'RESOLVED' } }),
      prisma.market.count({ where: { status: 'DISPUTED' } }),
    ]);

    res.json({
      growth: {
        signupsLast30d: signupRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      },
      revenue: {
        totalStakes: Number(stakesAgg._sum.amount || 0),
        totalPayouts: Number(payoutsAgg._sum.amount || 0),
        volumeLast30d: volumeRows.map((r) => ({ day: r.day, volume: Number(r.volume) })),
      },
      marketPerformance: {
        topMarkets,
        resolvedCount,
        disputedCount,
        disputeRate: resolvedCount + disputedCount > 0 ? (disputedCount / (resolvedCount + disputedCount)) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Error building reports summary:', error);
    res.status(500).json({ error: 'Failed to build reports summary' });
  }
};

exports.exportMarkets = async (req, res) => {
  try {
    const markets = await prisma.market.findMany({ orderBy: { createdAt: 'desc' } });
    const csv = toCsv(markets, [
      { label: 'ID', value: (m) => m.id },
      { label: 'Title', value: (m) => m.title },
      { label: 'Category', value: (m) => m.category },
      { label: 'Status', value: (m) => m.status },
      { label: 'Total Volume', value: (m) => m.totalVolume },
      { label: 'Total Predictions', value: (m) => m.totalPredictions },
      { label: 'Created At', value: (m) => m.createdAt.toISOString() },
      { label: 'Resolution Date', value: (m) => m.resolutionDate?.toISOString() || '' },
    ]);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="markets.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting markets:', error);
    res.status(500).json({ error: 'Failed to export markets' });
  }
};

exports.exportUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    const csv = toCsv(users, [
      { label: 'ID', value: (u) => u.id },
      { label: 'Username', value: (u) => u.username },
      { label: 'Email', value: (u) => u.email },
      { label: 'Total Balance', value: (u) => u.totalBalance },
      { label: 'Level', value: (u) => u.level },
      { label: 'Trust Score', value: (u) => u.trustScore },
      { label: 'Is Admin', value: (u) => u.isAdmin },
      { label: 'Is Suspended', value: (u) => u.isSuspended },
      { label: 'Created At', value: (u) => u.createdAt.toISOString() },
    ]);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
};

exports.exportLedger = async (req, res) => {
  try {
    const entries = await prisma.walletLedger.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const csv = toCsv(entries, [
      { label: 'ID', value: (e) => e.id },
      { label: 'User', value: (e) => e.user?.username },
      { label: 'Type', value: (e) => e.type },
      { label: 'SubType', value: (e) => e.subType || '' },
      { label: 'Amount', value: (e) => e.amount },
      { label: 'Balance Before', value: (e) => e.balanceBefore },
      { label: 'Balance After', value: (e) => e.balanceAfter },
      { label: 'Created At', value: (e) => e.createdAt.toISOString() },
    ]);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="wallet-ledger.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting ledger:', error);
    res.status(500).json({ error: 'Failed to export ledger' });
  }
};
