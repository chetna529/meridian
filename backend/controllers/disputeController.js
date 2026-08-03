const prisma = require('../lib/prisma');
const auditLog = require('../lib/auditLog');
const eventBus = require('../lib/eventBus');
const lifecycle = require('../services/marketLifecycle');

const DISPUTE_WINDOW_MS = (parseInt(process.env.DISPUTE_WINDOW_MINUTES || '60')) * 60 * 1000;

// Any participant can raise a dispute on a just-resolved market within the dispute window.
exports.raiseDispute = async (req, res) => {
  try {
    const { id: marketId } = req.params;
    const { reason, evidenceUrl } = req.body;
    const userId = req.user.userId;

    if (!reason) return res.status(400).json({ error: 'A reason is required to raise a dispute' });

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== 'RESOLVED') {
      return res.status(400).json({ error: 'Only resolved markets can be disputed' });
    }
    if (market.resolvedDate && Date.now() - new Date(market.resolvedDate).getTime() > DISPUTE_WINDOW_MS) {
      return res.status(400).json({ error: 'The dispute window for this market has closed' });
    }

    const participated = await prisma.prediction.findFirst({ where: { marketId, userId } });
    if (!participated) return res.status(403).json({ error: 'Only participants can dispute a market resolution' });

    const dispute = await prisma.$transaction(async (tx) => {
      lifecycle.assertTransition('RESOLVED', 'DISPUTED');
      await tx.market.update({ where: { id: marketId }, data: { status: 'DISPUTED' } });
      const created = await tx.dispute.create({ data: { marketId, raisedByUserId: userId, reason, evidenceUrl } });
      await auditLog.record(tx, { adminId: userId, action: 'RAISE_DISPUTE', entityType: 'Dispute', entityId: created.id, changes: { marketId, reason } });
      return created;
    });

    eventBus.publish('DisputeFiled', { marketId, disputeId: dispute.id, title: market.title });
    res.status(201).json(dispute);
  } catch (error) {
    console.error('Error raising dispute:', error);
    res.status(400).json({ error: error.message || 'Failed to raise dispute' });
  }
};

exports.listDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const disputes = await prisma.dispute.findMany({
      where: status ? { status } : undefined,
      include: { market: { select: { title: true, id: true } }, raisedBy: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(disputes);
  } catch (error) {
    console.error('Error listing disputes:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
};

// Admin review: UPHELD sends the market back to RESOLVING for a corrected resolution (no
// automatic payout clawback — money movement is always an explicit follow-up admin action).
exports.reviewDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, adminNotes } = req.body; // decision: 'UPHELD' | 'REJECTED'
    if (!['UPHELD', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be UPHELD or REJECTED' });
    }

    const dispute = await prisma.dispute.findUnique({ where: { id }, include: { market: true } });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    await prisma.$transaction(async (tx) => {
      await tx.dispute.update({ where: { id }, data: { status: decision, adminNotes, resolvedAt: new Date() } });

      const nextMarketStatus = decision === 'UPHELD' ? 'RESOLVING' : 'RESOLVED';
      lifecycle.assertTransition('DISPUTED', nextMarketStatus);
      await tx.market.update({ where: { id: dispute.marketId }, data: { status: nextMarketStatus } });

      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'REVIEW_DISPUTE',
        entityType: 'Dispute',
        entityId: id,
        changes: { decision, adminNotes },
      });
    });

    eventBus.publish('DisputeResolved', { marketId: dispute.marketId, disputeId: id, decision, title: dispute.market.title });
    res.json({ message: `Dispute ${decision.toLowerCase()}` });
  } catch (error) {
    console.error('Error reviewing dispute:', error);
    res.status(400).json({ error: error.message || 'Failed to review dispute' });
  }
};
