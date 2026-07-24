const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditLog = require('../lib/auditLog');
const lifecycle = require('../services/marketLifecycle');
const cache = require('../lib/cache');

// GET /api/admin/markets — full listing (every status), search, filters, pagination.
exports.listMarketsAdmin = async (req, res) => {
  try {
    const { search, status, category, cursor, take } = req.query;
    const pageSize = Math.min(Number(take) || 25, 100);

    const where = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const markets = await prisma.market.findMany({
      where,
      include: { options: true, _count: { select: { predictions: true, comments: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json({ markets, nextCursor: markets.length === pageSize ? markets[markets.length - 1].id : null });
  } catch (error) {
    console.error('Error listing markets (admin):', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
};

// POST /api/admin/markets/bulk — { marketIds: string[], action: 'approve'|'lock'|'cancel'|'archive' }
const BULK_ACTION_TARGET_STATUS = { approve: 'LIVE', lock: 'LOCKED', cancel: 'CANCELLED', archive: 'ARCHIVED' };

exports.bulkMarketAction = async (req, res) => {
  try {
    const { marketIds, action } = req.body;
    const to = BULK_ACTION_TARGET_STATUS[action];
    if (!Array.isArray(marketIds) || marketIds.length === 0 || !to) {
      return res.status(400).json({ error: 'marketIds[] and a valid action are required' });
    }

    const results = [];
    for (const marketId of marketIds) {
      try {
        const market = await prisma.market.findUnique({ where: { id: marketId } });
        if (!market) {
          results.push({ marketId, ok: false, error: 'Not found' });
          continue;
        }
        lifecycle.assertTransition(market.status, to);
        await prisma.$transaction(async (tx) => {
          await tx.market.update({ where: { id: marketId }, data: { status: to } });
          await auditLog.record(tx, {
            adminId: req.user.userId,
            action: `BULK_${action.toUpperCase()}_MARKET`,
            entityType: 'Market',
            entityId: marketId,
            changes: { from: market.status, to },
          });
        });
        await cache.del(`market:${marketId}`);
        results.push({ marketId, ok: true });
      } catch (err) {
        results.push({ marketId, ok: false, error: err.message });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error running bulk market action:', error);
    res.status(500).json({ error: 'Failed to run bulk action' });
  }
};

// GET /api/admin/markets/:id/timeline — merged audit trail + disputes for this market
exports.getMarketTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const [logs, disputes] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType: 'Market', entityId: id },
        include: { admin: { select: { username: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.dispute.findMany({
        where: { marketId: id },
        include: { raisedBy: { select: { username: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const events = [
      ...logs.map((l) => ({ type: 'AUDIT', action: l.action, actor: l.admin?.username, changes: l.changes, at: l.createdAt })),
      ...disputes.map((d) => ({ type: 'DISPUTE', action: `Dispute ${d.status}`, actor: d.raisedBy?.username, changes: { reason: d.reason }, at: d.createdAt })),
    ].sort((a, b) => new Date(a.at) - new Date(b.at));

    res.json(events);
  } catch (error) {
    console.error('Error fetching market timeline:', error);
    res.status(500).json({ error: 'Failed to fetch market timeline' });
  }
};

// GET /api/admin/markets/:id/participants
exports.getMarketParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const positions = await prisma.position.findMany({
      where: { marketId: id },
      include: { user: { select: { id: true, username: true } }, option: { select: { optionText: true } } },
      orderBy: { costBasis: 'desc' },
    });
    res.json(positions);
  } catch (error) {
    console.error('Error fetching market participants:', error);
    res.status(500).json({ error: 'Failed to fetch market participants' });
  }
};

// POST /api/admin/markets/:id/resolve/preview — { winningOptionId } — no writes, just a projection
exports.previewResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { winningOptionId } = req.body;

    const market = await prisma.market.findUnique({ where: { id }, include: { options: true } });
    if (!market) return res.status(404).json({ error: 'Market not found' });
    if (!market.options.find((o) => o.id === winningOptionId)) {
      return res.status(400).json({ error: 'Invalid winning option' });
    }

    const pendingPredictions = await prisma.prediction.findMany({ where: { marketId: id, status: 'PENDING' } });
    const winners = pendingPredictions.filter((p) => p.optionId === winningOptionId);
    const losers = pendingPredictions.filter((p) => p.optionId !== winningOptionId);
    const totalPayout = winners.reduce((sum, p) => sum + Number(p.potentialReturn || 0), 0);
    const totalStakeReturned = winners.reduce((sum, p) => sum + Number(p.amountStaked), 0);
    const totalLostStake = losers.reduce((sum, p) => sum + Number(p.amountStaked), 0);

    res.json({
      winnerCount: winners.length,
      loserCount: losers.length,
      totalPayout,
      totalStakeReturned,
      totalLostStake,
      netPlatformImpact: totalLostStake - (totalPayout - totalStakeReturned),
    });
  } catch (error) {
    console.error('Error previewing resolution:', error);
    res.status(500).json({ error: 'Failed to preview resolution' });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const predictions = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { username: true } },
        market: { select: { title: true } },
        option: { select: { optionText: true } },
      },
    });
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

exports.getOverviewTrends = async (req, res) => {
  try {
    const volumeRows = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("amountStaked"), 0) AS volume
      FROM "Prediction"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day ASC
    `;
    const signupRows = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day ASC
    `;

    const [stakesAgg, payoutsAgg, reserveAgg] = await Promise.all([
      prisma.transaction.aggregate({ where: { type: 'BUY' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'PAYOUT' }, _sum: { amount: true } }),
      prisma.user.aggregate({ _sum: { totalBalance: true } }),
    ]);

    res.json({
      volumeTrend: volumeRows.map((r) => ({ day: r.day, volume: Number(r.volume) })),
      signupTrend: signupRows.map((r) => ({ day: r.day, count: Number(r.count) })),
      totalStakes: Number(stakesAgg._sum.amount || 0),
      totalPayouts: Number(payoutsAgg._sum.amount || 0),
      totalReserve: Number(reserveAgg._sum.totalBalance || 0),
    });
  } catch (error) {
    console.error('Error fetching overview trends:', error);
    res.status(500).json({ error: 'Failed to fetch overview trends' });
  }
};

// POST /api/admin/comments/:commentId/pin — moderation toggle
exports.togglePinComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.comment.update({ where: { id: commentId }, data: { pinned: !comment.pinned } });
      await auditLog.record(tx, { adminId: req.user.userId, action: result.pinned ? 'PIN_COMMENT' : 'UNPIN_COMMENT', entityType: 'Comment', entityId: commentId, changes: {} });
      return result;
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling comment pin:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// DELETE /api/admin/comments/:commentId — moderation removal
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({ where: { parentCommentId: commentId } });
      await tx.comment.delete({ where: { id: commentId } });
      await auditLog.record(tx, { adminId: req.user.userId, action: 'DELETE_COMMENT', entityType: 'Comment', entityId: commentId, changes: { text: comment.text } });
    });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// GET /api/admin/wallet-ledger — platform-wide ledger with filters
exports.listWalletLedgerAdmin = async (req, res) => {
  try {
    const { userId, username, type, subType, from, to, cursor, take } = req.query;
    const pageSize = Math.min(Number(take) || 50, 200);

    const where = {
      ...(userId ? { userId } : {}),
      ...(username ? { user: { username: { contains: username, mode: 'insensitive' } } } : {}),
      ...(type ? { type } : {}),
      ...(subType ? { subType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const entries = await prisma.walletLedger.findMany({
      where,
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json({ entries, nextCursor: entries.length === pageSize ? entries[entries.length - 1].id : null });
  } catch (error) {
    console.error('Error listing wallet ledger (admin):', error);
    res.status(500).json({ error: 'Failed to fetch wallet ledger' });
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const { action, entityType, cursor, take } = req.query;
    const pageSize = Math.min(Number(take) || 50, 200);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
      },
      include: { admin: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json({ logs, nextCursor: logs.length === pageSize ? logs[logs.length - 1].id : null });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

exports.listFraudFlags = async (req, res) => {
  try {
    const { status } = req.query;
    const flags = await prisma.fraudFlag.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { username: true, email: true } }, market: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(flags);
  } catch (error) {
    console.error('Error listing fraud flags:', error);
    res.status(500).json({ error: 'Failed to fetch fraud flags' });
  }
};

exports.reviewFraudFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'CONFIRMED' | 'DISMISSED'
    if (!['CONFIRMED', 'DISMISSED'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be CONFIRMED or DISMISSED' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const flag = await tx.fraudFlag.update({ where: { id }, data: { status: decision, reviewedAt: new Date() } });
      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'REVIEW_FRAUD_FLAG',
        entityType: 'FraudFlag',
        entityId: id,
        changes: { decision },
      });
      return flag;
    });

    res.json(updated);
  } catch (error) {
    console.error('Error reviewing fraud flag:', error);
    res.status(500).json({ error: 'Failed to review fraud flag' });
  }
};
