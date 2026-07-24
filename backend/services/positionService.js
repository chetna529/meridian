// Position lifecycle: opened/added-to on trade, current price/P&L computed lazily on read
// (no per-trade fan-out write across every holder), closed on market resolution.

async function upsertPositionOnTrade(tx, { userId, marketId, optionId, shares, cost, entryPrice }) {
  const existing = await tx.position.findFirst({
    where: { userId, marketId, optionId, status: 'OPEN' },
  });

  if (existing) {
    const newShares = Number(existing.shares) + shares;
    const newCostBasis = Number(existing.costBasis) + cost;
    return tx.position.update({
      where: { id: existing.id },
      data: {
        shares: newShares,
        costBasis: newCostBasis,
        entryPrice: newShares > 0 ? newCostBasis / newShares : entryPrice,
      },
    });
  }

  return tx.position.create({
    data: {
      userId,
      marketId,
      optionId,
      shares,
      costBasis: cost,
      entryPrice,
    },
  });
}

// finalPriceByOptionId: { [optionId]: 1 | 0 } — winning option pays $1/share, others $0/share.
async function closePositionsForMarket(tx, marketId, finalPriceByOptionId) {
  const openPositions = await tx.position.findMany({ where: { marketId, status: 'OPEN' } });
  for (const position of openPositions) {
    const finalPrice = finalPriceByOptionId[position.optionId] ?? 0;
    const pnl = Number(position.shares) * finalPrice - Number(position.costBasis);
    await tx.position.update({
      where: { id: position.id },
      data: {
        status: 'CLOSED',
        currentPrice: finalPrice,
        pnl,
        closedAt: new Date(),
      },
    });
  }
}

function enrichPosition(position) {
  const shares = Number(position.shares);
  const costBasis = Number(position.costBasis);
  const currentPrice = position.status === 'CLOSED'
    ? Number(position.currentPrice ?? 0)
    : position.option?.currentOdds != null
      ? Number(position.option.currentOdds) / 100
      : Number(position.entryPrice ?? 0);
  const marketValue = shares * currentPrice;
  const pnl = position.status === 'CLOSED' ? Number(position.pnl ?? 0) : marketValue - costBasis;
  const roiPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return {
    ...position,
    entryPrice: Number(position.entryPrice),
    currentPrice,
    marketValue,
    pnl,
    roiPercentage,
  };
}

module.exports = { upsertPositionOnTrade, closePositionsForMarket, enrichPosition };
