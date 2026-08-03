const prisma = require('../lib/prisma');
const walletService = require('../services/walletService');

// Paginated wallet ledger — the authoritative, auditable record of every balance change.
exports.getLedger = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cursor, take } = req.query;
    const pageSize = Math.min(Number(take) || 30, 100);

    const entries = await prisma.walletLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    res.json({ entries, nextCursor: entries.length === pageSize ? entries[entries.length - 1].id : null });
  } catch (error) {
    console.error('Error fetching wallet ledger:', error);
    res.status(500).json({ error: 'Failed to fetch wallet ledger' });
  }
};

// Simulated cash deposit (Credits user balance, adds transaction + notification)
exports.depositFunds = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const { user } = await walletService.credit(tx, {
        userId,
        subType: 'DEPOSIT',
        amount: numericAmount,
        metadata: { source: 'User simulated deposit' }
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount: numericAmount,
          reason: 'Deposited funds to wallet',
          balanceAfter: Number(user.totalBalance)
        }
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'WALLET_DEPOSIT',
          title: 'Deposit Successful 💰',
          message: `Your deposit of ${numericAmount.toLocaleString()} points was successful. Current balance: ${Number(user.totalBalance).toLocaleString()} points.`
        }
      });

      return user;
    });

    res.json({ message: 'Deposit successful', totalBalance: result.totalBalance });
  } catch (error) {
    console.error('Error depositing funds:', error);
    res.status(500).json({ error: 'Failed to deposit funds' });
  }
};

// Simulated cash withdrawal (Debits user balance, adds transaction + notification)
exports.withdrawFunds = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    const userObj = await prisma.user.findUnique({ where: { id: userId } });
    if (Number(userObj.totalBalance) < numericAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const { user } = await walletService.debit(tx, {
        userId,
        subType: 'WITHDRAWAL',
        amount: numericAmount,
        metadata: { destination: 'User simulated withdrawal' }
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amount: numericAmount,
          reason: 'Withdrew funds from wallet',
          balanceAfter: Number(user.totalBalance)
        }
      });

      await tx.notification.create({
        data: {
          userId,
          type: 'WALLET_WITHDRAWAL',
          title: 'Withdrawal Processed 💰',
          message: `Your withdrawal of ${numericAmount.toLocaleString()} points has been processed. Current balance: ${Number(user.totalBalance).toLocaleString()} points.`
        }
      });

      return user;
    });

    res.json({ message: 'Withdrawal successful', totalBalance: result.totalBalance });
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    res.status(500).json({ error: error.message || 'Failed to withdraw funds' });
  }
};
