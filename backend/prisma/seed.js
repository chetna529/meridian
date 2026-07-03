const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.badge.createMany({
    data: [
      { badgeType: 'BEGINNER', displayName: 'Beginner', description: 'Joined Meridian' },
      { badgeType: 'TOP_TRADER', displayName: 'Top Trader', description: 'Top performing trader' },
      { badgeType: 'MARKET_PROPHET', displayName: 'Market Prophet', description: 'High prediction accuracy' },
      { badgeType: 'COMMUNITY_LEAD', displayName: 'Community Lead', description: 'Posted engaging market comments' },
      { badgeType: 'RISK_TAKER', displayName: 'Risk Taker', description: 'Placed bold predictions' }
    ],
    skipDuplicates: true
  });

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@meridian.com' },
      update: { passwordHash, isAdmin: true },
      create: { email: 'admin@meridian.com', username: 'admin', passwordHash, isAdmin: true }
    }),
    prisma.user.upsert({
      where: { email: 'trader1@meridian.com' },
      update: {},
      create: { email: 'trader1@meridian.com', username: 'trader1', passwordHash: 'dummy_hash' }
    }),
    prisma.user.upsert({
      where: { email: 'trader2@meridian.com' },
      update: {},
      create: { email: 'trader2@meridian.com', username: 'trader2', passwordHash: 'dummy_hash' }
    }),
    prisma.user.upsert({
      where: { email: 'sportsfan@meridian.com' },
      update: {},
      create: { email: 'sportsfan@meridian.com', username: 'sportsfan', passwordHash: 'dummy_hash' }
    })
  ]);

  const [admin] = users;

  const markets = [];
  const marketData = [
    {
      title: 'Will Bitcoin reach $150,000 by Dec 2026?',
      description: 'Predict whether BTC will cross $150k before the end of 2026.',
      category: 'Crypto',
      status: 'LIVE',
      resolutionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      liquidityPool: 10000
    },
    {
      title: 'Will Team India win the 2026 Cricket World Cup?',
      description: 'A prediction market on India winning the next World Cup.',
      category: 'Sports',
      status: 'LIVE',
      resolutionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      liquidityPool: 7500
    },
    {
      title: 'Will GPT-6 launch before Dec 2025?',
      description: 'Predict if the next major GPT model ships before year end.',
      category: 'Tech',
      status: 'LIVE',
      resolutionDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      liquidityPool: 8500
    }
  ];

  for (const marketPayload of marketData) {
    const existing = await prisma.market.findFirst({ where: { title: marketPayload.title } });
    if (existing) {
      markets.push(existing);
      continue;
    }

    const market = await prisma.market.create({
      data: {
        ...marketPayload,
        creatorId: admin.id
      }
    });
    markets.push(market);
  }

  await Promise.all(markets.map((market) =>
    prisma.marketOption.createMany({
      data: [
        { marketId: market.id, optionText: 'YES' },
        { marketId: market.id, optionText: 'NO' }
      ],
      skipDuplicates: true
    })
  ));

  await prisma.walletLedger.createMany({
    data: [
      { userId: admin.id, type: 'CREDIT', subType: 'INITIAL_DEPOSIT', amount: 10000, balanceBefore: 0, balanceAfter: 10000, metadata: { source: 'seed' } },
      { userId: admin.id, type: 'DEBIT', subType: 'PREDICTION_STAKE', amount: 500, balanceBefore: 10000, balanceAfter: 9500, metadata: { market: markets[0].title, option: 'YES' } }
    ],
    skipDuplicates: true
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
