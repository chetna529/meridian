const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { generateReferralCode } = require('./services/referralService');

async function uniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@meridian.test' },
    update: {},
    create: {
      email: 'admin@meridian.test',
      username: 'admin',
      passwordHash,
      totalBalance: 1000000,
      referralCode: await uniqueReferralCode()
    }
  });

  // Create initial markets
  const markets = [
    {
      title: "Will Bitcoin cross $100k by end of year?",
      description: "Resolves YES if BTC crosses $100k on Binance before Dec 31, 2026.",
      category: "Crypto",
      status: "LIVE",
      totalVolume: 1250000,
      yesPercentage: 78,
      noPercentage: 22,
      options: [{ optionText: "YES", totalStaked: 975000 }, { optionText: "NO", totalStaked: 275000 }]
    },
    {
      title: "Will SpaceX launch Starship to Mars in 2026?",
      description: "Resolves YES if SpaceX successfully launches an uncrewed Starship to Mars before end of 2026.",
      category: "Tech",
      status: "LIVE",
      totalVolume: 850000,
      yesPercentage: 45,
      noPercentage: 55,
      options: [{ optionText: "YES", totalStaked: 382500 }, { optionText: "NO", totalStaked: 467500 }]
    },
    {
      title: "US Presidential Election 2028 Winner",
      description: "Resolves to the sworn-in winner of the 2028 US Presidential Election.",
      category: "Politics",
      status: "LIVE",
      totalVolume: 3400000,
      yesPercentage: 52,
      noPercentage: 48,
      options: [{ optionText: "Democratic Nominee", totalStaked: 1768000 }, { optionText: "Republican Nominee", totalStaked: 1632000 }]
    }
  ];

  for (const m of markets) {
    const existing = await prisma.market.findFirst({ where: { title: m.title } });
    if (!existing) {
      await prisma.market.create({
        data: {
          title: m.title,
          description: m.description,
          category: m.category,
          status: m.status,
          totalVolume: m.totalVolume,
          yesPercentage: m.yesPercentage,
          noPercentage: m.noPercentage,
          creatorId: admin.id,
          resolutionDate: new Date('2026-12-31'),
          options: {
            create: m.options
          }
        }
      });
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
