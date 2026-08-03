const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAnalyticsData() {
  console.log('Starting continuous analytics & price history seed...');
  const now = new Date();
  const markets = await prisma.market.findMany({
    include: { options: true }
  });

  const dummyUsers = await prisma.user.findMany({ take: 10 });
  if (dummyUsers.length === 0) {
    console.log('No users found to attach predictions to.');
  }

  for (const market of markets) {
    console.log(`Seeding price history for market: "${market.title}"`);
    
    // Clear old price history for this market to rebuild continuous series
    await prisma.marketPriceHistory.deleteMany({ where: { marketId: market.id } });

    for (const option of market.options) {
      let basePrice = option.optionText.toUpperCase().includes('YES') 
        ? (market.yesPercentage ? Number(market.yesPercentage) / 100 : 0.55)
        : (market.noPercentage ? Number(market.noPercentage) / 100 : 0.45);

      // Generate 120 points spanning 30 days up to right now (1 point every 6 hours)
      const points = [];
      const totalPoints = 120;
      const stepMs = (30 * 24 * 60 * 60 * 1000) / totalPoints;

      for (let i = totalPoints; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * stepMs);
        
        // Random walk for price history simulation
        const noise = (Math.random() - 0.49) * 0.03;
        basePrice = Math.max(0.05, Math.min(0.95, basePrice + noise));

        // On the final point (now), align closer to current odds
        if (i === 0 && option.currentOdds) {
          basePrice = Number(option.currentOdds) / 100;
        }

        points.push({
          marketId: market.id,
          optionId: option.id,
          price: Number(basePrice.toFixed(4)),
          recordedAt: timestamp
        });
      }

      await prisma.marketPriceHistory.createMany({
        data: points
      });
    }

    // Seed recent prediction trades over past 7 days if predictions count < 10
    const predCount = await prisma.prediction.count({ where: { marketId: market.id } });
    if (predCount < 10 && dummyUsers.length > 0 && market.options.length > 0) {
      for (let i = 0; i < 15; i++) {
        const user = dummyUsers[i % dummyUsers.length];
        const option = market.options[i % market.options.length];
        const stake = Math.floor(Math.random() * 500) + 50;
        const daysAgo = Math.random() * 7;
        const predDate = new Date(now.getTime() - daysAgo * 24 * 3600 * 1000);

        await prisma.prediction.create({
          data: {
            userId: user.id,
            marketId: market.id,
            optionId: option.id,
            amountStaked: stake,
            potentialReturn: stake * 1.8,
            status: 'PENDING',
            createdAt: predDate
          }
        });
      }
    }

    // Compute fresh MarketAnalytics record
    const since24h = new Date(now.getTime() - 24 * 3600 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const [preds24h, preds7d, distinctTraders, firstOption] = await Promise.all([
      prisma.prediction.aggregate({ where: { marketId: market.id, createdAt: { gte: since24h } }, _sum: { amountStaked: true } }),
      prisma.prediction.aggregate({ where: { marketId: market.id, createdAt: { gte: since7d } }, _sum: { amountStaked: true } }),
      prisma.prediction.findMany({ where: { marketId: market.id }, select: { userId: true }, distinct: ['userId'] }),
      prisma.marketOption.findFirst({ where: { marketId: market.id } }),
    ]);

    let priceMove24h = (Math.random() * 8 - 4);
    if (firstOption) {
      const [latest, dayAgo] = await Promise.all([
        prisma.marketPriceHistory.findFirst({ where: { marketId: market.id, optionId: firstOption.id }, orderBy: { recordedAt: 'desc' } }),
        prisma.marketPriceHistory.findFirst({ where: { marketId: market.id, optionId: firstOption.id, recordedAt: { lte: since24h } }, orderBy: { recordedAt: 'desc' } }),
      ]);
      if (latest && dayAgo) priceMove24h = (Number(latest.price) - Number(dayAgo.price)) * 100;
    }

    const vol24h = Number(preds24h._sum.amountStaked || 0) || Math.floor(Math.random() * 25000 + 5000);
    const vol7d = Number(preds7d._sum.amountStaked || 0) || Math.floor(Math.random() * 150000 + 30000);

    await prisma.marketAnalytics.create({
      data: {
        marketId: market.id,
        volume24h: vol24h,
        volume7d: vol7d,
        tradersCount: Math.max(distinctTraders.length, Math.floor(Math.random() * 40 + 12)),
        liquidity: Number(market.liquidityParam || 100) * 50,
        priceMove24h: Number(priceMove24h.toFixed(1)),
        computedAt: now
      }
    });

    // Update total volume on market if zero
    if (!market.totalVolume || Number(market.totalVolume) === 0) {
      await prisma.market.update({
        where: { id: market.id },
        data: { totalVolume: vol7d }
      });
    }
  }

  console.log('Analytics & price history seeding completed successfully!');
}

seedAnalyticsData()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
