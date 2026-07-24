const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();
const { generateReferralCode } = require('../services/referralService');
const pricing = require('../lib/pricingService');

const DAY_MS = 86400000;
const NOW = new Date();

const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS);
const daysFromNow = (n) => new Date(NOW.getTime() + n * DAY_MS);
const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const randFloat = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function uniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

const TRADER_USERNAMES = [
  'trader1', 'trader2', 'sportsfan', 'cryptoqueen', 'moonshot_max', 'dataviz_dan',
  'polly_predicts', 'techbull_tara', 'sam_the_skeptic', 'nova_trades', 'quant_quinn',
  'riskitall_ray', 'steady_eddie', 'wildcard_wren', 'oracle_omar',
];

const MARKET_DEFS = [
  {
    title: 'Will Bitcoin reach $150,000 by Dec 2026?',
    description: 'Predict whether BTC will cross $150k before the end of 2026.',
    category: 'Crypto', b: 120, createdAgo: 55, resolutionIn: 40, bias: 0.62, status: 'LIVE',
  },
  {
    title: 'Will Team India win the 2026 Cricket World Cup?',
    description: 'A prediction market on India winning the next World Cup.',
    category: 'Sports', b: 100, createdAgo: 50, resolutionIn: 75, bias: 0.55, status: 'LIVE',
  },
  {
    title: 'Will GPT-6 launch before Dec 2025?',
    description: 'Predict if the next major GPT model ships before year end.',
    category: 'Tech', b: 90, createdAgo: 75, resolvedAgo: 6, bias: 0.7, status: 'RESOLVED', winningIndex: 0,
    sourceUrl: 'https://openai.com/blog/gpt-6-announcement', notes: 'Official announcement confirms GPT-6 launched ahead of schedule.',
  },
  {
    title: 'Will the US Federal Reserve cut rates in Q3 2026?',
    description: 'Resolves YES if the Fed announces a rate cut during Q3 2026.',
    category: 'Politics', b: 110, createdAgo: 25, resolutionIn: 25, bias: 0.48, status: 'LIVE',
  },
  {
    title: 'Will Manchester City win the Premier League 2025-26?',
    description: 'Predict the winner of the 2025-26 Premier League season.',
    category: 'Sports', b: 130, createdAgo: 60, resolutionIn: 35, bias: 0.58, status: 'LIVE',
  },
  {
    title: 'Will Apple release AR glasses in 2026?',
    description: 'Resolves YES if Apple ships a consumer AR glasses product in 2026.',
    category: 'Tech', b: 95, createdAgo: 35, resolutionIn: 95, bias: 0.4, status: 'LIVE',
  },
  {
    title: "Will Ethereum flip Bitcoin's market cap by 2027?",
    description: 'The classic "flippening" — will ETH market cap exceed BTC by 2027?',
    category: 'Crypto', b: 140, createdAgo: 40, resolutionIn: 260, bias: 0.3, status: 'LIVE',
  },
  {
    title: 'Will Taylor Swift announce a new album in 2026?',
    description: 'Resolves YES if a new studio album is officially announced in 2026.',
    category: 'Entertainment', b: 80, createdAgo: 18, resolutionIn: 65, bias: 0.67, status: 'LIVE',
  },
  {
    title: 'Will the Democratic candidate win the 2028 US Presidential Election?',
    description: 'Resolves to the sworn-in winner of the 2028 US Presidential Election.',
    category: 'Politics', b: 150, createdAgo: 65, resolutionIn: 540, bias: 0.51, status: 'LIVE',
  },
  {
    title: 'Will Tesla stock hit $500 by end of 2026?',
    description: 'Resolves YES if TSLA closes at or above $500 on any trading day in 2026.',
    category: 'Finance', b: 100, createdAgo: 85, resolvedAgo: 18, bias: 0.35, status: 'RESOLVED', winningIndex: 1,
    sourceUrl: 'https://www.nasdaq.com/market-activity/stocks/tsla', notes: 'TSLA closed the year below $500; market resolves NO.',
  },
];

async function main() {
  console.log('Seeding database with raw analytics data...');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const traderPasswordHash = await bcrypt.hash('trader123', 10);

  // --- Badge catalog -------------------------------------------------------
  await prisma.badge.createMany({
    data: [
      { badgeType: 'BEGINNER', displayName: 'Beginner', description: 'Joined Meridian' },
      { badgeType: 'TOP_TRADER', displayName: 'Top Trader', description: 'Top performing trader' },
      { badgeType: 'MARKET_PROPHET', displayName: 'Market Prophet', description: 'Maintained 75%+ accuracy over 5+ predictions' },
      { badgeType: 'COMMUNITY_LEAD', displayName: 'Community Lead', description: 'Posted engaging market comments' },
      { badgeType: 'RISK_TAKER', displayName: 'Risk Taker', description: 'Placed bold predictions' },
      { badgeType: 'FIRST_PREDICTION', displayName: 'First Prediction', description: 'Placed your first prediction' },
      { badgeType: 'BEGINNERS_LUCK', displayName: "Beginner's Luck", description: 'Won your first prediction' },
      { badgeType: 'DIVERSIFIED', displayName: 'Diversified', description: 'Predicted in 3 or more distinct categories' },
      { badgeType: 'SHARPSHOOTER', displayName: 'Sharpshooter', description: 'Won 10 or more predictions' },
      { badgeType: 'VETERAN_TRADER', displayName: 'Veteran Trader', description: 'Placed 25 or more predictions' },
    ],
    skipDuplicates: true,
  });
  const badges = await prisma.badge.findMany();
  const badgeIdByType = Object.fromEntries(badges.map((b) => [b.badgeType, b.id]));

  // --- Users -----------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@meridian.com' },
    update: { passwordHash: adminPasswordHash, isAdmin: true },
    create: {
      email: 'admin@meridian.com', username: 'admin', passwordHash: adminPasswordHash, isAdmin: true,
      referralCode: await uniqueReferralCode(), createdAt: daysAgo(90), reputationScore: 500,
    },
  });

  const traders = [];
  for (let i = 0; i < TRADER_USERNAMES.length; i++) {
    const username = TRADER_USERNAMES[i];
    const signupDaysAgo = i < 5 ? randInt(40, 60) : i < 11 ? randInt(8, 39) : randFloat(0.2, 6.5);
    const user = await prisma.user.upsert({
      where: { email: `${username}@meridian.com` },
      update: {},
      create: {
        email: `${username}@meridian.com`,
        username,
        passwordHash: traderPasswordHash,
        bio: `Prediction market enthusiast. Trading since day one.`,
        reputationScore: randInt(0, 600),
        totalBalance: randInt(5000, 25000),
        createdAt: daysAgo(signupDaysAgo),
        referralCode: await uniqueReferralCode(),
      },
    });
    traders.push(user);
  }

  // --- Markets + options -------------------------------------------------
  const markets = [];
  for (const def of MARKET_DEFS) {
    let market = await prisma.market.findFirst({ where: { title: def.title } });
    if (!market) {
      market = await prisma.market.create({
        data: {
          title: def.title,
          description: def.description,
          category: def.category,
          status: 'LIVE',
          creatorId: admin.id,
          liquidityPool: def.b * 80,
          liquidityParam: def.b,
          createdAt: daysAgo(def.createdAgo),
          resolutionDate: def.status === 'RESOLVED' ? daysAgo(def.resolvedAgo) : daysFromNow(def.resolutionIn),
        },
      });
    }
    let yes = await prisma.marketOption.findFirst({ where: { marketId: market.id, optionText: 'YES' } });
    if (!yes) yes = await prisma.marketOption.create({ data: { marketId: market.id, optionText: 'YES', createdAt: daysAgo(def.createdAgo) } });
    let no = await prisma.marketOption.findFirst({ where: { marketId: market.id, optionText: 'NO' } });
    if (!no) no = await prisma.marketOption.create({ data: { marketId: market.id, optionText: 'NO', createdAt: daysAgo(def.createdAgo) } });

    markets.push({
      def, id: market.id, title: def.title,
      options: [yes, no],
      q: [0, 0],
      totalVolume: 0, totalPredictions: 0,
      optionAgg: [
        { totalStaked: 0, predictionCount: 0 },
        { totalStaked: 0, predictionCount: 0 },
      ],
    });
  }

  // --- Build a chronologically-ordered trade schedule across all markets ---
  const trades = [];
  for (const m of markets) {
    const createdAt = daysAgo(m.def.createdAgo).getTime();
    if (m.def.status === 'RESOLVED') {
      const effectiveEnd = daysAgo(m.def.resolvedAgo + 2).getTime();
      const spanDays = Math.max(1, (effectiveEnd - createdAt) / DAY_MS);
      const count = Math.round(spanDays * 2.5);
      for (let i = 0; i < count; i++) {
        trades.push({ market: m, ts: createdAt + Math.random() * (effectiveEnd - createdAt) });
      }
    } else {
      const weekStart = NOW.getTime() - 7 * DAY_MS;
      const dayStart = NOW.getTime() - 1 * DAY_MS;
      const spanDays = Math.max(1, (weekStart - createdAt) / DAY_MS);
      const historicalCount = Math.round(spanDays * 2.5);
      for (let i = 0; i < historicalCount; i++) {
        trades.push({ market: m, ts: createdAt + Math.random() * (weekStart - createdAt) });
      }
      for (let i = 0; i < 14; i++) {
        trades.push({ market: m, ts: weekStart + Math.random() * (dayStart - weekStart) });
      }
      for (let i = 0; i < 6; i++) {
        trades.push({ market: m, ts: dayStart + Math.random() * (NOW.getTime() - dayStart) });
      }
    }
  }
  trades.sort((a, b) => a.ts - b.ts);

  // --- Simulate the trade timeline, building rows for bulk insert --------
  const balances = new Map(traders.map((t) => [t.id, Number(t.totalBalance)]));
  const invested = new Map(traders.map((t) => [t.id, 0]));

  const predictionRows = [];
  const priceHistoryRows = [];
  const transactionRows = [];
  const walletLedgerRows = [];
  const positionMap = new Map(); // key: userId|marketId|optionId

  for (const trade of trades) {
    const m = trade.market;
    const user = pick(traders);
    const balance = balances.get(user.id);
    if (balance < 5) continue;

    const optionIndex = Math.random() < m.def.bias ? 0 : 1;
    let stake = Math.random() < 0.08 ? randFloat(500, 1500) : randFloat(20, 200);
    stake = Math.min(stake, balance * 0.6);
    if (stake < 5) continue;

    const shares = pricing.sharesForBudget(m.q, optionIndex, stake, m.def.b);
    if (!shares || shares <= 0) continue;

    const balanceBefore = balance;
    const balanceAfter = balance - stake;
    balances.set(user.id, balanceAfter);
    invested.set(user.id, invested.get(user.id) + stake);

    const predictionId = randomUUID();
    const createdAt = new Date(trade.ts);
    const option = m.options[optionIndex];

    predictionRows.push({
      id: predictionId, userId: user.id, marketId: m.id, optionId: option.id,
      amountStaked: stake, potentialReturn: shares, status: 'PENDING',
      createdAt, updatedAt: createdAt,
    });
    transactionRows.push({
      id: randomUUID(), userId: user.id, type: 'BUY', amount: stake,
      reason: `Placed prediction on market: ${m.title}`, marketId: m.id, balanceAfter, createdAt,
    });
    walletLedgerRows.push({
      id: randomUUID(), userId: user.id, type: 'DEBIT', subType: 'PREDICTION_STAKE',
      amount: stake, balanceBefore, balanceAfter, referenceId: predictionId,
      metadata: { marketId: m.id, optionId: option.id }, createdAt,
    });

    m.q[optionIndex] += shares;
    const pricesAfter = pricing.price(m.q, m.def.b);
    for (let i = 0; i < m.options.length; i++) {
      priceHistoryRows.push({ id: randomUUID(), marketId: m.id, optionId: m.options[i].id, price: pricesAfter[i], recordedAt: createdAt });
    }
    m.totalVolume += stake;
    m.totalPredictions += 1;
    m.optionAgg[optionIndex].totalStaked += stake;
    m.optionAgg[optionIndex].predictionCount += 1;
    m.yesPercentage = pricesAfter[0] * 100;
    m.noPercentage = pricesAfter[1] * 100;

    const posKey = `${user.id}|${m.id}|${option.id}`;
    const existingPos = positionMap.get(posKey);
    if (existingPos) {
      existingPos.shares += shares;
      existingPos.costBasis += stake;
      existingPos.entryPrice = existingPos.costBasis / existingPos.shares;
    } else {
      positionMap.set(posKey, {
        id: randomUUID(), userId: user.id, marketId: m.id, optionId: option.id,
        shares, costBasis: stake, entryPrice: stake / shares,
        status: 'OPEN', createdAt, closedAt: null, currentPrice: null, pnl: 0,
      });
    }
  }

  // --- Resolve the RESOLVED markets ---------------------------------------
  const notificationRows = [];
  const marketResolutionRows = [];

  for (const m of markets) {
    if (m.def.status !== 'RESOLVED') continue;
    const winningOption = m.options[m.def.winningIndex];
    const resolvedAt = daysAgo(m.def.resolvedAgo);

    marketResolutionRows.push({
      id: randomUUID(), marketId: m.id, sourceUrl: m.def.sourceUrl, evidenceUrl: null,
      notes: m.def.notes, resolvedByUserId: admin.id, winningOptionId: winningOption.id, resolvedAt,
    });

    for (const pred of predictionRows.filter((p) => p.marketId === m.id && p.status === 'PENDING')) {
      const isWinner = pred.optionId === winningOption.id;
      pred.status = isWinner ? 'WON' : 'LOST';
      pred.resolvedAt = resolvedAt;
      invested.set(pred.userId, invested.get(pred.userId) - Number(pred.amountStaked));

      if (isWinner) {
        const payout = Number(pred.potentialReturn);
        const balanceBefore = balances.get(pred.userId);
        const balanceAfter = balanceBefore + payout;
        balances.set(pred.userId, balanceAfter);

        transactionRows.push({
          id: randomUUID(), userId: pred.userId, type: 'PAYOUT', amount: payout,
          reason: `Payout for winning market: ${m.title}`, marketId: m.id, balanceAfter, createdAt: resolvedAt,
        });
        walletLedgerRows.push({
          id: randomUUID(), userId: pred.userId, type: 'CREDIT', subType: 'PAYOUT',
          amount: payout, balanceBefore, balanceAfter, referenceId: pred.id,
          metadata: { marketId: m.id }, createdAt: resolvedAt,
        });
      }

      notificationRows.push({
        id: randomUUID(), userId: pred.userId,
        type: isWinner ? 'MARKET_WON' : 'MARKET_LOST',
        title: isWinner ? 'Prediction Won!' : 'Prediction Resolved',
        message: isWinner
          ? `You won ${Number(pred.potentialReturn).toLocaleString()} points from ${m.title}!`
          : `${m.title} has resolved. Your stake of ${Number(pred.amountStaked).toLocaleString()} was not returned.`,
        createdAt: resolvedAt,
      });
    }

    for (const pos of positionMap.values()) {
      if (pos.marketId !== m.id) continue;
      const finalPrice = pos.optionId === winningOption.id ? 1 : 0;
      pos.status = 'CLOSED';
      pos.currentPrice = finalPrice;
      pos.pnl = pos.shares * finalPrice - pos.costBasis;
      pos.closedAt = resolvedAt;
    }

    m.finalStatus = 'RESOLVED';
    m.resolvedDate = resolvedAt;
  }

  // --- Persist everything --------------------------------------------------
  console.log(`Inserting ${predictionRows.length} predictions, ${priceHistoryRows.length} price points, ${transactionRows.length} transactions, ${walletLedgerRows.length} ledger entries...`);

  await prisma.walletLedger.createMany({ data: walletLedgerRows, skipDuplicates: true });
  await prisma.transaction.createMany({ data: transactionRows, skipDuplicates: true });
  await prisma.marketPriceHistory.createMany({ data: priceHistoryRows, skipDuplicates: true });
  await prisma.prediction.createMany({
    data: predictionRows.map((p) => ({ ...p, resolvedAt: p.resolvedAt || null })),
    skipDuplicates: true,
  });
  await prisma.position.createMany({ data: [...positionMap.values()], skipDuplicates: true });
  await prisma.marketResolution.createMany({ data: marketResolutionRows, skipDuplicates: true });
  await prisma.notification.createMany({ data: notificationRows, skipDuplicates: true });

  for (const m of markets) {
    await prisma.market.update({
      where: { id: m.id },
      data: {
        totalVolume: m.totalVolume,
        totalPredictions: m.totalPredictions,
        yesPercentage: m.yesPercentage ?? 50,
        noPercentage: m.noPercentage ?? 50,
        ...(m.finalStatus === 'RESOLVED' ? { status: 'RESOLVED', resolvedDate: m.resolvedDate } : {}),
      },
    });
    for (let i = 0; i < m.options.length; i++) {
      await prisma.marketOption.update({
        where: { id: m.options[i].id },
        data: {
          totalStaked: m.optionAgg[i].totalStaked,
          sharesOutstanding: m.q[i],
          predictionCount: m.optionAgg[i].predictionCount,
          currentOdds: (m.yesPercentage != null ? [m.yesPercentage, m.noPercentage][i] : 50),
        },
      });
    }
  }

  for (const t of traders) {
    await prisma.user.update({
      where: { id: t.id },
      data: { totalBalance: Math.max(0, balances.get(t.id)), investedBalance: Math.max(0, invested.get(t.id)) },
    });
  }

  // --- MarketAnalytics for LIVE markets (mirrors jobs/analyticsJob.js) -----
  const since24h = NOW.getTime() - DAY_MS;
  const since7d = NOW.getTime() - 7 * DAY_MS;
  const analyticsRows = [];
  for (const m of markets) {
    if (m.def.status !== 'LIVE') continue;
    const marketPreds = predictionRows.filter((p) => p.marketId === m.id);
    const volume24h = marketPreds.filter((p) => p.createdAt.getTime() >= since24h).reduce((s, p) => s + p.amountStaked, 0);
    const volume7d = marketPreds.filter((p) => p.createdAt.getTime() >= since7d).reduce((s, p) => s + p.amountStaked, 0);
    const tradersCount = new Set(marketPreds.map((p) => p.userId)).size;

    const firstOptionId = m.options[0].id;
    const optionHistory = priceHistoryRows.filter((h) => h.marketId === m.id && h.optionId === firstOptionId).sort((a, b) => a.recordedAt - b.recordedAt);
    const latest = optionHistory[optionHistory.length - 1];
    const dayAgo = [...optionHistory].reverse().find((h) => h.recordedAt.getTime() <= since24h);
    const priceMove24h = latest && dayAgo ? (Number(latest.price) - Number(dayAgo.price)) * 100 : 0;

    analyticsRows.push({
      id: randomUUID(), marketId: m.id, volume24h, volume7d, tradersCount,
      liquidity: m.def.b, priceMove24h, computedAt: NOW,
    });
  }
  await prisma.marketAnalytics.createMany({ data: analyticsRows, skipDuplicates: true });

  // --- Leaderboard (mirrors jobs/leaderboardJob.js) ------------------------
  const leaderboardRows = [];
  for (const t of traders) {
    const userPreds = predictionRows.filter((p) => p.userId === t.id);
    const totalPredictions = userPreds.length;
    const won = userPreds.filter((p) => p.status === 'WON').length;
    const resolved = userPreds.filter((p) => p.status === 'WON' || p.status === 'LOST').length;
    const winRate = resolved > 0 ? (won / resolved) * 100 : 0;
    const payouts = transactionRows.filter((tr) => tr.userId === t.id && tr.type === 'PAYOUT').reduce((s, tr) => s + tr.amount, 0);
    const stakes = transactionRows.filter((tr) => tr.userId === t.id && tr.type === 'BUY').reduce((s, tr) => s + tr.amount, 0);
    const profit = payouts - stakes;
    const accountAgeDays = Math.floor((NOW.getTime() - t.createdAt.getTime()) / DAY_MS);
    const trustScore = Math.max(0, Math.min(100, winRate * 0.5 + Math.min(totalPredictions, 100) * 0.2 + Math.min(accountAgeDays, 150) * 0.1));
    const score = balances.get(t.id) + profit + t.reputationScore * 10;

    await prisma.user.update({ where: { id: t.id }, data: { trustScore, accuracyPercentage: winRate } });
    leaderboardRows.push({ userId: t.id, totalPredictions, winRate, profit, trustScore, score });
  }
  leaderboardRows.sort((a, b) => b.score - a.score);
  for (let i = 0; i < leaderboardRows.length; i++) {
    const r = leaderboardRows[i];
    await prisma.leaderboard.upsert({
      where: { userId_leaderboardType: { userId: r.userId, leaderboardType: 'GLOBAL' } },
      update: { score: r.score, winRatePercentage: r.winRate, totalProfit: r.profit, totalPredictions: r.totalPredictions, rank: i + 1, computedAt: NOW },
      create: { userId: r.userId, leaderboardType: 'GLOBAL', score: r.score, winRatePercentage: r.winRate, totalProfit: r.profit, totalPredictions: r.totalPredictions, rank: i + 1 },
    });
  }

  // --- Badges (mirrors lib/gamification.js checkBadges) --------------------
  const badgeEarnedRows = [];
  const badgeNotificationRows = [];
  for (const t of traders) {
    const userPreds = predictionRows.filter((p) => p.userId === t.id);
    const total = userPreds.length;
    const won = userPreds.filter((p) => p.status === 'WON');
    const categories = new Set(userPreds.map((p) => markets.find((m) => m.id === p.marketId)?.def.category));
    const toAward = [];
    if (total >= 1) toAward.push('FIRST_PREDICTION');
    if (won.length >= 1) toAward.push('BEGINNERS_LUCK');
    if (categories.size >= 3) toAward.push('DIVERSIFIED');
    if (won.length >= 10) toAward.push('SHARPSHOOTER');
    if (total >= 25) toAward.push('VETERAN_TRADER');
    const accuracy = total >= 5 ? (won.length / total) * 100 : 0;
    if (total >= 5 && accuracy >= 75) toAward.push('MARKET_PROPHET');

    for (const badgeType of toAward) {
      const badgeId = badgeIdByType[badgeType];
      if (!badgeId) continue;
      badgeEarnedRows.push({ id: randomUUID(), userId: t.id, badgeId, earnedAt: NOW });
      badgeNotificationRows.push({
        id: randomUUID(), userId: t.id, type: 'BADGE_EARNED', title: 'Badge Earned! 🏆',
        message: `Congratulations! You earned the "${badgeType.replace(/_/g, ' ')}" badge!`, createdAt: NOW,
      });
    }
  }
  await prisma.badgeEarned.createMany({ data: badgeEarnedRows, skipDuplicates: true });
  await prisma.notification.createMany({ data: badgeNotificationRows, skipDuplicates: true });

  // --- A handful of comments for engagement ---------------------------------
  const commentTexts = [
    'This is looking more likely every week.',
    'Not convinced — the numbers just aren\'t there yet.',
    'Great liquidity on this one, easy to get in and out.',
    'Watching this closely, could swing either way.',
    'Historical trend strongly favors this outcome.',
    'Added to my portfolio, feels undervalued right now.',
  ];
  const commentRows = [];
  for (const m of markets) {
    const count = randInt(2, 4);
    for (let i = 0; i < count; i++) {
      commentRows.push({
        id: randomUUID(), userId: pick(traders).id, marketId: m.id, text: pick(commentTexts),
        likes: randInt(0, 25), createdAt: new Date(daysAgo(m.def.createdAgo).getTime() + Math.random() * (NOW.getTime() - daysAgo(m.def.createdAgo).getTime())),
      });
    }
  }
  await prisma.comment.createMany({ data: commentRows, skipDuplicates: true });

  // --- A couple of disputes / fraud flags for admin views -------------------
  const resolvedMarket = markets.find((m) => m.def.status === 'RESOLVED');
  if (resolvedMarket) {
    await prisma.dispute.createMany({
      data: [{
        id: randomUUID(), marketId: resolvedMarket.id, raisedByUserId: pick(traders).id,
        reason: 'Resolution source seems outdated, requesting a re-check.',
        status: 'REJECTED', adminNotes: 'Reviewed evidence, original resolution stands.',
        createdAt: daysAgo(resolvedMarket.def.resolvedAgo - 1), resolvedAt: daysAgo(resolvedMarket.def.resolvedAgo - 2),
      }],
      skipDuplicates: true,
    });
  }
  await prisma.fraudFlag.createMany({
    data: [
      { id: randomUUID(), userId: pick(traders).id, marketId: pick(markets).id, type: 'RAPID_FIRE', severity: 2, status: 'OPEN', details: { note: 'Multiple trades within seconds' }, createdAt: daysAgo(3) },
      { id: randomUUID(), userId: pick(traders).id, marketId: pick(markets).id, type: 'VOLUME_SPIKE', severity: 1, status: 'DISMISSED', details: { note: 'Reviewed, legitimate whale trade' }, createdAt: daysAgo(10), reviewedAt: daysAgo(9) },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully with full analytics data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
