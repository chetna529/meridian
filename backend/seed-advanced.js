const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

async function main() {
  console.log('Seeding advanced database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  let admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@meridian.test',
        username: 'admin',
        passwordHash,
        totalBalance: 1000000,
        referralCode: await uniqueReferralCode(),
        isAdmin: true
      }
    });
  }

  // Create dummy users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    let u = await prisma.user.findUnique({ where: { username: `user${i}` } });
    if (!u) {
      u = await prisma.user.create({
        data: {
          email: `user${i}@meridian.test`,
          username: `user${i}`,
          passwordHash,
          totalBalance: 50000 + i * 10000,
          referralCode: await uniqueReferralCode(),
        }
      });
    }
    users.push(u);
  }

  // Create initial markets
  const marketTemplates = [
    {
      title: "Will OpenAI release GPT-5 in 2026?",
      description: "Resolves YES if OpenAI officially releases a model named GPT-5 before Dec 31, 2026.",
      category: "AI",
      status: "LIVE",
      totalVolume: 5250000,
      yesPercentage: 65,
      noPercentage: 35,
      options: [{ optionText: "YES", totalStaked: 3412500 }, { optionText: "NO", totalStaked: 1837500 }]
    },
    {
      title: "Will the S&P 500 cross 6,500 in Q3 2026?",
      description: "Resolves YES if the S&P 500 index closes above 6,500 at any point during Q3 2026.",
      category: "Finance",
      status: "LIVE",
      totalVolume: 8200000,
      yesPercentage: 42,
      noPercentage: 58,
      options: [{ optionText: "YES", totalStaked: 3444000 }, { optionText: "NO", totalStaked: 4756000 }]
    },
    {
      title: "Will humans land on Mars by 2030?",
      description: "Resolves YES if a human successfully lands on Mars and returns alive or establishes a base by 2030.",
      category: "Space",
      status: "LIVE",
      totalVolume: 1500000,
      yesPercentage: 20,
      noPercentage: 80,
      options: [{ optionText: "YES", totalStaked: 300000 }, { optionText: "NO", totalStaked: 1200000 }]
    }
  ];

  for (const m of marketTemplates) {
    let existingMarket = await prisma.market.findFirst({ where: { title: m.title } });
    if (!existingMarket) {
      existingMarket = await prisma.market.create({
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
        },
        include: { options: true }
      });
      
      console.log(`Created market: ${existingMarket.title}`);

      // Seed market analytics
      await prisma.marketAnalytics.create({
        data: {
          marketId: existingMarket.id,
          volume24h: Math.random() * 500000,
          volume7d: Math.random() * 2000000,
          tradersCount: Math.floor(Math.random() * 500) + 100,
          liquidity: Math.random() * 100000,
          priceMove24h: (Math.random() * 10) - 5
        }
      });

      // Seed market price history for graph (last 24 hours, hourly data points)
      const now = new Date();
      const options = existingMarket.options;
      for (const option of options) {
        let currentPrice = option.optionText === "YES" ? m.yesPercentage / 100 : m.noPercentage / 100;
        
        for (let i = 24; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - i * 3600000);
          
          // Add some randomness to the price
          const change = (Math.random() * 0.04) - 0.02; // +/- 2%
          currentPrice = Math.max(0.01, Math.min(0.99, currentPrice + change));
          
          await prisma.marketPriceHistory.create({
            data: {
              marketId: existingMarket.id,
              optionId: option.id,
              price: currentPrice,
              recordedAt: timestamp
            }
          });
        }
      }

      // Seed comments
      for (let i = 0; i < 3; i++) {
        await prisma.comment.create({
          data: {
            marketId: existingMarket.id,
            userId: users[i % users.length].id,
            text: `This is a fascinating market! I think it will resolve ${i % 2 === 0 ? 'YES' : 'NO'}.`,
            likes: Math.floor(Math.random() * 20)
          }
        });
      }

      // Seed predictions/positions
      for (let i = 0; i < 5; i++) {
        const option = options[i % 2];
        const amount = Math.floor(Math.random() * 1000) + 100;
        await prisma.prediction.create({
          data: {
            userId: users[i].id,
            marketId: existingMarket.id,
            optionId: option.id,
            amountStaked: amount,
            potentialReturn: amount * (1 / (option.optionText === "YES" ? m.yesPercentage / 100 : m.noPercentage / 100)),
            status: "PENDING"
          }
        });
        
        await prisma.position.create({
          data: {
            userId: users[i].id,
            marketId: existingMarket.id,
            optionId: option.id,
            shares: amount,
            costBasis: amount,
            entryPrice: option.optionText === "YES" ? m.yesPercentage / 100 : m.noPercentage / 100,
            status: "OPEN"
          }
        });
      }
    }
  }

  console.log('Advanced seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
