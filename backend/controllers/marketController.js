const prisma = require('../lib/prisma');
const { checkBadges } = require('../lib/gamification');
const { sendEmail } = require('../lib/email');

const cache = require('../lib/cache');
const eventBus = require('../lib/eventBus');
const walletService = require('../services/walletService');
const positionService = require('../services/positionService');
const auditLog = require('../lib/auditLog');
const lifecycle = require('../services/marketLifecycle');

function optionPercentage(option, optionCount) {
  return option.currentOdds != null ? Number(option.currentOdds) : 100 / Math.max(optionCount, 1);
}

// Get all markets
exports.getMarkets = async (req, res) => {
  try {
    const { category, status } = req.query;

    let filter = {};
    if (category) filter.category = category;
    filter.status = status || { in: ['LIVE', 'LOCKED', 'RESOLVING', 'RESOLVED'] };

    const cacheKey = `markets:${category || 'all'}:${status || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const markets = await prisma.market.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        options: { include: { _count: { select: { predictions: true } } } },
        comments: { take: 3 },
      },
    });

    const enriched = markets.map((m) => {
      const options = m.options.map((o) => ({
        ...o,
        percentage: optionPercentage(o, m.options.length),
        predictionCount: o._count?.predictions || 0,
      }));
      const totalVotes = options.reduce((sum, opt) => sum + opt.predictionCount, 0);
      return { ...m, options, totalVotes };
    });

    await cache.set(cacheKey, enriched, 30);
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
};

// Get single market
exports.getMarket = async (req, res) => {
  try {
    const cacheKey = `market:${req.params.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
      include: {
        options: true,
        comments: {
          include: { user: { select: { username: true, avatarUrl: true } } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        predictions: { where: { userId: req.user?.userId }, include: { option: true } },
        resolution: { include: { resolvedBy: { select: { username: true } } } },
        disputes: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const options = market.options.map((opt) => ({
      ...opt,
      percentage: optionPercentage(opt, market.options.length),
    }));

    const out = { ...market, options, userPredictions: market.predictions };
    await cache.set(cacheKey, out, 30);
    res.json(out);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
};

// Admin: create a market (starts as DRAFT, or PENDING_APPROVAL if submitted for review)
exports.createMarket = async (req, res) => {
  try {
    const { title, description, category, resolutionDate, resolutionCriteria, imageUrl, options, liquidityParam, submit } = req.body;

    if (!title || title.trim().length < 8) return res.status(400).json({ error: 'Title must be at least 8 characters' });
    if (!description || description.trim().length < 20) return res.status(400).json({ error: 'Description must be at least 20 characters' });
    if (!resolutionCriteria || resolutionCriteria.trim().length < 10) return res.status(400).json({ error: 'Resolution criteria must be at least 10 characters' });
    if (resolutionDate && new Date(resolutionDate).getTime() <= Date.now()) return res.status(400).json({ error: 'Resolution date must be in the future' });
    const cleanOptions = (options || []).map((o) => ({ optionText: String(o.optionText || '').trim() })).filter((o) => o.optionText);
    const finalOptions = cleanOptions.length >= 2 ? cleanOptions : [{ optionText: 'YES' }, { optionText: 'NO' }];
    if (new Set(finalOptions.map((o) => o.optionText.toUpperCase())).size !== finalOptions.length) {
      return res.status(400).json({ error: 'Option labels must be unique' });
    }
    if (liquidityParam !== undefined && Number(liquidityParam) <= 0) return res.status(400).json({ error: 'Liquidity must be a positive number' });

    const market = await prisma.$transaction(async (tx) => {
      const created = await tx.market.create({
        data: {
          title,
          description,
          category,
          resolutionDate: resolutionDate ? new Date(resolutionDate) : null,
          resolutionCriteria,
          imageUrl,
          liquidityParam: liquidityParam || 100,
          creatorId: req.user.userId,
          status: submit ? 'PENDING_APPROVAL' : 'DRAFT',
          options: { create: finalOptions },
        },
        include: { options: true },
      });

      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'CREATE_MARKET',
        entityType: 'Market',
        entityId: created.id,
        changes: { title, category, status: created.status },
      });

      return created;
    });

    res.status(201).json(market);
  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ error: 'Failed to create market' });
  }
};

async function transitionMarket(req, res, { to, extraData = {}, action }) {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    lifecycle.assertTransition(market.status, to);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.market.update({ where: { id }, data: { status: to, ...extraData } });
      await auditLog.record(tx, {
        adminId: req.user.userId,
        action,
        entityType: 'Market',
        entityId: id,
        changes: { from: market.status, to },
      });
      return result;
    });

    await cache.del(`market:${id}`);
    if (to === 'LOCKED') eventBus.publish('MarketLocked', { marketId: id, title: market.title });

    res.json(updated);
  } catch (error) {
    console.error(`Error transitioning market (${action}):`, error);
    res.status(400).json({ error: error.message || 'Failed to update market status' });
  }
}

// Admin: schedule an automatic publish (DRAFT/PENDING_APPROVAL -> LIVE) at a future time
exports.schedulePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { publishAt } = req.body;
    const publishDate = new Date(publishAt);
    if (!publishAt || publishDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'publishAt must be a valid future date/time' });
    }

    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(market.status)) {
      return res.status(400).json({ error: 'Only DRAFT or PENDING_APPROVAL markets can be scheduled' });
    }

    const { marketPublishQueue } = require('../jobs/marketPublishJob');
    await marketPublishQueue.add('publish', { marketId: id, adminId: req.user.userId }, { delay: publishDate.getTime() - Date.now() });

    await auditLog.record(prisma, {
      adminId: req.user.userId,
      action: 'SCHEDULE_MARKET_PUBLISH',
      entityType: 'Market',
      entityId: id,
      changes: { publishAt: publishDate },
    });

    res.json({ message: 'Publish scheduled', publishAt: publishDate });
  } catch (error) {
    console.error('Error scheduling publish:', error);
    res.status(500).json({ error: 'Failed to schedule publish' });
  }
};

exports.submitForReview = (req, res) => transitionMarket(req, res, { to: 'PENDING_APPROVAL', action: 'SUBMIT_MARKET_FOR_REVIEW' });
exports.approveMarket = (req, res) => transitionMarket(req, res, { to: 'LIVE', action: 'APPROVE_MARKET' });
exports.lockMarket = (req, res) => transitionMarket(req, res, { to: 'LOCKED', action: 'LOCK_MARKET' });
exports.startResolving = (req, res) => transitionMarket(req, res, { to: 'RESOLVING', action: 'START_RESOLVING_MARKET' });
exports.cancelMarket = (req, res) => transitionMarket(req, res, { to: 'CANCELLED', action: 'CANCEL_MARKET' });
exports.archiveMarket = (req, res) => transitionMarket(req, res, { to: 'ARCHIVED', action: 'ARCHIVE_MARKET' });

// Admin: resolve a market with required evidence (sourceUrl + notes)
exports.resolveMarket = async (req, res) => {
  try {
    const { id } = req.params;
    const { winningOptionId, sourceUrl, evidenceUrl, notes } = req.body;

    if (!sourceUrl || !notes) {
      return res.status(400).json({ error: 'A resolution source and notes are required to resolve a market' });
    }

    const market = await prisma.market.findUnique({ where: { id }, include: { options: true } });
    if (!market || !['LOCKED', 'RESOLVING'].includes(market.status)) {
      return res.status(400).json({ error: 'Market must be LOCKED or RESOLVING to resolve' });
    }

    const winningOption = market.options.find((o) => o.id === winningOptionId);
    if (!winningOption) return res.status(400).json({ error: 'Invalid winning option' });

    await prisma.$transaction(async (tx) => {
      if (market.status === 'LOCKED') {
        lifecycle.assertTransition('LOCKED', 'RESOLVING');
      }
      lifecycle.assertTransition('RESOLVING', 'RESOLVED');

      await tx.market.update({ where: { id }, data: { status: 'RESOLVED', resolvedDate: new Date() } });

      await tx.marketResolution.create({
        data: { marketId: id, sourceUrl, evidenceUrl, notes, resolvedByUserId: req.user.userId, winningOptionId },
      });

      const allPending = await tx.prediction.findMany({ where: { marketId: id, status: 'PENDING' } });

      for (const pred of allPending) {
        const isWinner = pred.optionId === winningOptionId;
        const payout = isWinner ? Number(pred.potentialReturn) : 0;

        if (isWinner) {
          await walletService.credit(tx, {
            userId: pred.userId,
            subType: 'PAYOUT',
            amount: payout,
            referenceId: pred.id,
            metadata: { marketId: id },
          });
        }

        await tx.user.update({ where: { id: pred.userId }, data: { investedBalance: { decrement: Number(pred.amountStaked) } } });

        await tx.prediction.update({ where: { id: pred.id }, data: { status: isWinner ? 'WON' : 'LOST', resolvedAt: new Date() } });

        if (isWinner) {
          await tx.transaction.create({
            data: { userId: pred.userId, type: 'PAYOUT', amount: payout, reason: `Payout for winning market: ${market.title}`, marketId: id, balanceAfter: payout },
          });
        }

        await tx.notification.create({
          data: {
            userId: pred.userId,
            type: isWinner ? 'MARKET_WON' : 'MARKET_LOST',
            title: isWinner ? 'Prediction Won!' : 'Prediction Resolved',
            message: isWinner
              ? `You won ${payout.toLocaleString()} points from ${market.title}!`
              : `${market.title} has resolved. Your stake of ${Number(pred.amountStaked).toLocaleString()} was not returned.`,
          },
        });

        if (isWinner) await checkBadges(tx, pred.userId);
      }

      const finalPriceByOptionId = Object.fromEntries(market.options.map((o) => [o.id, o.id === winningOptionId ? 1 : 0]));
      await positionService.closePositionsForMarket(tx, id, finalPriceByOptionId);

      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'RESOLVE_MARKET',
        entityType: 'Market',
        entityId: id,
        changes: { winningOptionId, sourceUrl },
      });
    });

    eventBus.publish('MarketResolved', { marketId: id, title: market.title, winningOptionId });

    prisma.prediction
      .findMany({ where: { marketId: id }, include: { user: true } })
      .then((predictions) => {
        for (const pred of predictions) {
          const isWon = pred.status === 'WON';
          const payout = Number(pred.potentialReturn || 0);
          const subject = isWon ? 'You won your prediction! 🎉' : 'Prediction resolved';
          const html = `
            <h2>Market resolved: ${market.title}</h2>
            <p>Hi ${pred.user.username},</p>
            <p>Your prediction status: <strong>${pred.status}</strong></p>
            ${isWon ? `<p>You have earned <strong>${payout.toLocaleString()} points</strong>!</p>` : `<p>Your stake of ${Number(pred.amountStaked)} was lost.</p>`}
            <p>Thank you for participating!</p>
          `;
          sendEmail(pred.user.email, subject, html).catch((err) => console.error(err));
        }
      })
      .catch((err) => console.error('Failed to trigger resolution emails:', err));

    try {
      await cache.del(`market:${id}`);
      await cache.del('markets:all:all');
    } catch (e) {
      console.warn('Failed to clear cache:', e.message);
    }

    res.json({ message: 'Market resolved successfully' });
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ error: 'Failed to resolve market' });
  }
};

exports.deleteMarket = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    await prisma.$transaction(async (tx) => {
      await tx.dispute.deleteMany({ where: { marketId: id } });
      await tx.fraudFlag.deleteMany({ where: { marketId: id } });
      await tx.marketResolution.deleteMany({ where: { marketId: id } });
      await tx.comment.deleteMany({ where: { marketId: id } });
      await tx.position.deleteMany({ where: { marketId: id } });
      await tx.prediction.deleteMany({ where: { marketId: id } });
      await tx.transaction.deleteMany({ where: { marketId: id } });
      await tx.marketPriceHistory.deleteMany({ where: { marketId: id } });
      await tx.marketAnalytics.deleteMany({ where: { marketId: id } });
      await tx.marketOption.deleteMany({ where: { marketId: id } });
      await tx.market.delete({ where: { id } });

      await auditLog.record(tx, {
        adminId: req.user.userId,
        action: 'DELETE_MARKET',
        entityType: 'Market',
        entityId: id,
        changes: { title: market.title },
      });
    });

    res.json({ message: 'Market deleted successfully' });
  } catch (error) {
    console.error('Error deleting market:', error);
    res.status(500).json({ error: 'Failed to delete market' });
  }
};

// Add a comment (supports replies)
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user.userId;

    const comment = await prisma.comment.create({
      data: { marketId: id, userId, text, parentCommentId: parentCommentId || null },
      include: { user: { select: { username: true, avatarUrl: true } } },
    });

    if (parentCommentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentCommentId } });
      if (parent && parent.userId !== userId) {
        const notification = await prisma.notification.create({
          data: {
            userId: parent.userId,
            type: 'COMMENT_REPLY',
            title: 'New reply',
            message: `${comment.user.username} replied to your comment`,
            data: { marketId: id, commentId: comment.id },
          },
        });
        eventBus.publish('NotificationCreated', { ...notification, userId: parent.userId });
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Get comments (includes nested replies)
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { marketId: id, parentCommentId: null },
      include: {
        user: { select: { username: true, avatarUrl: true, reputationScore: true } },
        replies: {
          include: { user: { select: { username: true, avatarUrl: true, reputationScore: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// React to comment
exports.reactToComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reaction } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    let currentReactions = comment.reactions || {};
    if (typeof currentReactions === 'string') currentReactions = JSON.parse(currentReactions);
    currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { reactions: currentReactions, likes: reaction === 'LIKE' ? comment.likes + 1 : comment.likes },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error reacting to comment:', error);
    res.status(500).json({ error: 'Failed to react to comment' });
  }
};

// GET /api/markets/:id/price-history?range=1h|24h|7d|30d
exports.getPriceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const range = req.query.range || '24h';
    const rangeMs = { '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 }[range] || 86400e3;
    const since = new Date(Date.now() - rangeMs);

    let points = await prisma.marketPriceHistory.findMany({
      where: { marketId: id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      include: { market: false },
    });

    // If range returned too few points (e.g., tight timeframe), fetch recent 50 points
    if (points.length < 2) {
      points = await prisma.marketPriceHistory.findMany({
        where: { marketId: id },
        orderBy: { recordedAt: 'desc' },
        take: 50,
      });
      points.reverse();
    }

    const options = await prisma.marketOption.findMany({ where: { marketId: id } });
    const byOption = {};
    for (const opt of options) byOption[opt.id] = { optionText: opt.optionText, points: [] };
    for (const p of points) {
      if (p.optionId && byOption[p.optionId]) {
        byOption[p.optionId].points.push({ price: Number(p.price), recordedAt: p.recordedAt });
      }
    }

    res.json(byOption);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
};

// GET /api/markets/:id/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const analytics = await prisma.marketAnalytics.findFirst({ where: { marketId: id }, orderBy: { computedAt: 'desc' } });
    res.json(analytics || { marketId: id, volume24h: 0, volume7d: 0, tradersCount: 0, liquidity: 0, priceMove24h: 0 });
  } catch (error) {
    console.error('Error fetching market analytics:', error);
    res.status(500).json({ error: 'Failed to fetch market analytics' });
  }
};

// GET /api/markets/:id/raw-data
exports.getRawAnalyticsData = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({
      where: { id },
      include: { options: true }
    });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const [analytics, priceHistory, recentTrades] = await Promise.all([
      prisma.marketAnalytics.findFirst({ where: { marketId: id }, orderBy: { computedAt: 'desc' } }),
      prisma.marketPriceHistory.findMany({
        where: { marketId: id },
        orderBy: { recordedAt: 'desc' },
        take: 100
      }),
      prisma.prediction.findMany({
        where: { marketId: id },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          option: { select: { optionText: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const optionMap = new Map(market.options.map(o => [o.id, o.optionText]));
    const formattedHistory = priceHistory.map(p => ({
      id: p.id,
      optionId: p.optionId,
      optionText: optionMap.get(p.optionId) || 'Option',
      price: Number(p.price),
      probabilityPercent: (Number(p.price) * 100).toFixed(1) + '%',
      recordedAt: p.recordedAt
    }));

    const formattedTrades = recentTrades.map(t => ({
      id: t.id,
      username: t.user?.username || 'Anonymous',
      avatarUrl: t.user?.avatarUrl || null,
      optionText: t.option?.optionText || 'Option',
      amountStaked: Number(t.amountStaked),
      potentialReturn: Number(t.potentialReturn),
      status: t.status,
      createdAt: t.createdAt
    }));

    res.json({
      market: {
        id: market.id,
        title: market.title,
        category: market.category,
        totalVolume: Number(market.totalVolume || 0),
        liquidityParam: Number(market.liquidityParam || 100),
        options: market.options
      },
      analytics: analytics || {
        marketId: id,
        volume24h: 0,
        volume7d: 0,
        tradersCount: 0,
        liquidity: 0,
        priceMove24h: 0
      },
      priceHistory: formattedHistory,
      recentTrades: formattedTrades
    });
  } catch (error) {
    console.error('Error fetching raw analytics data:', error);
    res.status(500).json({ error: 'Failed to fetch raw analytics data' });
  }
};

// Fetch real-time market data (Alpha Vantage / OpenWeather)
exports.fetchRealMarketData = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    let fetchedData = null;
    let type = 'NONE';

    if (market.category.toUpperCase().includes('WEATHER') || market.title.toLowerCase().includes('weather') || market.title.toLowerCase().includes('temperature')) {
      type = 'WEATHER';
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey) {
        const city = market.title.toLowerCase().includes('london') ? 'London' : 'New York';
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
        const data = await response.json();
        if (data.main) {
          fetchedData = { temperature: data.main.temp, humidity: data.main.humidity, weather: data.weather[0]?.main, city, updatedAt: new Date() };
        }
      }
    } else if (market.category.toUpperCase().includes('FINANCE') || market.category.toUpperCase().includes('STOCK') || market.title.toLowerCase().includes('apple') || market.title.toLowerCase().includes('tesla')) {
      type = 'STOCK';
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (apiKey) {
        const symbol = market.title.toLowerCase().includes('apple') ? 'AAPL' : 'TSLA';
        const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
        const data = await response.json();
        const quote = data['Global Quote'];
        if (quote) {
          fetchedData = { symbol, price: Number(quote['05. price']), volume: Number(quote['06. volume']), change: quote['09. change'], updatedAt: new Date() };
        }
      }
    }

    if (fetchedData) {
      const updatedMarket = await prisma.market.update({
        where: { id },
        data: { liquidityPool: type === 'STOCK' ? fetchedData.price : market.liquidityPool },
      });
      return res.json({ success: true, type, data: fetchedData, market: updatedMarket });
    }

    res.json({ success: false, message: 'No live data source matched for this market criteria or API key missing.' });
  } catch (error) {
    console.error('Error fetching real market data:', error);
    res.status(500).json({ error: 'Failed to fetch real-world data feed' });
  }
};
