// Single source of truth for balance changes. Every credit/debit to User.totalBalance
// must go through applyLedgerEntry so the WalletLedger stays authoritative and reconcilable.

async function applyLedgerEntry(tx, { userId, type, subType, amount, referenceId, metadata }) {
  if (type !== 'CREDIT' && type !== 'DEBIT') {
    throw new Error(`Invalid ledger entry type: ${type}`);
  }

  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User ${userId} not found`);

  const balanceBefore = Number(user.totalBalance);
  const delta = Number(amount);
  const balanceAfter = type === 'CREDIT' ? balanceBefore + delta : balanceBefore - delta;

  if (type === 'DEBIT' && balanceAfter < 0) {
    throw new Error('Insufficient balance');
  }

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { totalBalance: balanceAfter },
  });

  const ledgerEntry = await tx.walletLedger.create({
    data: {
      userId,
      type,
      subType,
      amount: delta,
      balanceBefore,
      balanceAfter,
      referenceId: referenceId || null,
      metadata: metadata || undefined,
    },
  });

  return { user: updatedUser, ledgerEntry };
}

async function credit(tx, params) {
  return applyLedgerEntry(tx, { ...params, type: 'CREDIT' });
}

async function debit(tx, params) {
  return applyLedgerEntry(tx, { ...params, type: 'DEBIT' });
}

module.exports = { applyLedgerEntry, credit, debit };
