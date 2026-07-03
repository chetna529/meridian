const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkBadges } = require('../lib/gamification');
const { sendEmail } = require('../lib/email');

const cache = require('../lib/cache');
const pricing = require('../lib/pricingService');

const adminOnly = (req, res) => {
  if (req.user?.username !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
};

// Get all markets

exports.getMarkets = async (req, res) => {
  try {
    const { category, status } = req.query;
    
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    const cacheKey = `markets:${category || 'all'}:${status || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const markets = await prisma.market.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          include: {
            _count: { select: { predictions: true } }
          }
        },
        comments: { take: 3 }
      }
    });

    // enrich with computed odds using pricing service
    const enriched = markets.map(m => {
      const total = m.options.reduce((s, o) => s + Number(o.totalStaked || 0), 0) || 1;
      const options = m.options.map(o => ({
        ...o,
        percentage: pricing.computeOdds(total, o.totalStaked),
        predictionCount: o._count?.predictions || 0
      }));
      const totalVotes = options.reduce((sum, opt) => sum + opt.predictionCount, 0);
      return { ...m, options, totalVotes, totalVolume: total };
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
        options: {
          include: {
            predictions: {
              select: { amountStaked: true }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: { username: true, avatarUrl: true }
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        predictions: {
          where: { userId: req.user?.userId },
          include: { option: true }
        }
      }
    });
    if (!market) return res.status(404).json({ error: 'Market not found' });
    // calculate odds
    const totalStaked = market.options.reduce((sum, opt) => sum + opt.predictions.reduce((s, pred) => s + Number(pred.amountStaked), 0), 0);
    const optionsWithOdds = market.options.map((opt) => {
      const optionTotal = opt.predictions.reduce((s, pred) => s + Number(pred.amountStaked), 0);
      return { ...opt, percentage: totalStaked > 0 ? (optionTotal / totalStaked) * 100 : 50, volume: optionTotal };
    });

    const out = { ...market, options: optionsWithOdds, totalVolume: totalStaked, userPredictions: market.predictions };
    await cache.set(cacheKey, out, 30);
    res.json(out);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
};

// Admin: Create market
exports.createMarket = async (req, res) => {
  if (!adminOnly(req, res)) return;

  try {
    const { title, description, category, resolutionDate, resolutionCriteria, imageUrl, options } = req.body;
    
    const market = await prisma.market.create({
      data: {
        title,
        description,
        category,
        resolutionDate: new Date(resolutionDate),
        resolutionCriteria,
        imageUrl,
        creatorId: req.user.userId,
        status: 'LIVE',
        options: {
          create: options || [
            { optionText: 'YES' },
            { optionText: 'NO' }
          ]
        }
      },
      include: { options: true }
    });

    res.status(201).json(market);
  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ error: 'Failed to create market' });
  }
};

// Admin: Resolve a market
exports.resolveMarket = async (req, res) => {
  if (!adminOnly(req, res)) return;

  try {
    const { id } = req.params;
    const { winningOptionId } = req.body;

    const market = await prisma.market.findUnique({
      where: { id },
      include: { options: true }
    });

    if (!market || !['LIVE', 'LOCKED'].includes(market.status)) {
      return res.status(400).json({ error: 'Market is not available for resolution' });
    }

    const winningOption = market.options.find(o => o.id === winningOptionId);
    if (!winningOption) return res.status(400).json({ error: 'Invalid winning option' });

    // Use transaction to resolve market and distribute payouts
    await prisma.$transaction(async (tx) => {
      // 1. Update Market
      await tx.market.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedDate: new Date()
        }
      });

      // 2. Fetch winning predictions
      const winningPredictions = await tx.prediction.findMany({
        where: { marketId: id, optionId: winningOptionId, status: 'PENDING' }
      });

      // 3. Process payouts
      for (const pred of winningPredictions) {
        const payout = Number(pred.potentialReturn);
        
        await tx.user.update({
          where: { id: pred.userId },
          data: { totalBalance: { increment: payout } }
        });

        await tx.prediction.update({
          where: { id: pred.id },
          data: { status: 'WON', resolvedAt: new Date() }
        });

        await tx.transaction.create({
          data: {
            userId: pred.userId,
            type: 'PAYOUT',
            amount: payout,
            reason: `Payout for winning market: ${market.title}`,
            marketId: id,
            balanceAfter: payout // Simplified for MVP
          }
        });

        // Wallet ledger entry for payout
        await tx.walletLedger.create({
          data: {
            userId: pred.userId,
            type: 'CREDIT',
            subType: 'PAYOUT',
            amount: payout,
            balanceBefore: 0,
            balanceAfter: payout,
            referenceId: pred.id,
            metadata: { marketId: id }
          }
        });

        // Create Notification
        await tx.notification.create({
          data: {
            userId: pred.userId,
            type: 'MARKET_WON',
            title: 'Prediction Won!',
            message: `You won $${payout.toLocaleString()} from ${market.title}!`,
          }
        });

        // Gamification badge check
        await checkBadges(tx, pred.userId);
      }

      // 4. Update losing predictions
      await tx.prediction.updateMany({
        where: { marketId: id, status: 'PENDING', optionId: { not: winningOptionId } },
        data: { status: 'LOST', resolvedAt: new Date() }
      });
    });

    // Send emails to the prediction owners in background
    prisma.prediction.findMany({
      where: { marketId: id },
      include: { user: true }
    }).then(predictions => {
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
        sendEmail(pred.user.email, subject, html).catch(err => console.error(err));
      }
    }).catch(err => console.error('Failed to trigger resolution emails:', err));

    // Invalidate caches for this market and markets list
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
  if (!adminOnly(req, res)) return;

  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    await prisma.$transaction(async (tx) => {
      await tx.comment.deleteMany({ where: { marketId: id } });
      await tx.position.deleteMany({ where: { marketId: id } });
      await tx.prediction.deleteMany({ where: { marketId: id } });
      await tx.transaction.deleteMany({ where: { marketId: id } });
      await tx.marketPriceHistory.deleteMany({ where: { marketId: id } });
      await tx.marketAnalytics.deleteMany({ where: { marketId: id } });
      await tx.marketOption.deleteMany({ where: { marketId: id } });
      await tx.market.delete({ where: { id } });
    });

    res.json({ message: 'Market deleted successfully' });
  } catch (error) {
    console.error('Error deleting market:', error);
    res.status(500).json({ error: 'Failed to delete market' });
  }
};

// Add a comment
// Add a comment (supports replies)
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user.userId;

    const comment = await prisma.comment.create({
      data: {
        marketId: id,
        userId,
        text,
        parentCommentId: parentCommentId || null
      },
      include: { user: { select: { username: true, avatarUrl: true } } }
    });

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
    // Get top-level comments first
    const comments = await prisma.comment.findMany({
      where: { marketId: id, parentCommentId: null },
      include: {
        user: { select: { username: true, avatarUrl: true, reputationScore: true } },
        replies: {
          include: {
            user: { select: { username: true, avatarUrl: true, reputationScore: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' }
      ]
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
    const { reaction } = req.body; // e.g. "LIKE", "FIRE", "ROCKET", "100"

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    let currentReactions = comment.reactions || {};
    if (typeof currentReactions === 'string') {
      currentReactions = JSON.parse(currentReactions);
    }
    
    currentReactions[reaction] = (currentReactions[reaction] || 0) + 1;

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        reactions: currentReactions,
        likes: reaction === 'LIKE' ? comment.likes + 1 : comment.likes
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error reacting to comment:', error);
    res.status(500).json({ error: 'Failed to react to comment' });
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

    // 1. Weather Market Integration
    if (market.category.toUpperCase().includes('WEATHER') || market.title.toLowerCase().includes('weather') || market.title.toLowerCase().includes('temperature')) {
      type = 'WEATHER';
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (apiKey) {
        // Default to London or extract city name
        const city = market.title.toLowerCase().includes('london') ? 'London' : 'New York';
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`);
        const data = await response.json();
        if (data.main) {
          fetchedData = {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            weather: data.weather[0]?.main,
            city,
            updatedAt: new Date()
          };
        }
      }
    } 
    // 2. Stock / Finance Market Integration
    else if (market.category.toUpperCase().includes('FINANCE') || market.category.toUpperCase().includes('STOCK') || market.title.toLowerCase().includes('apple') || market.title.toLowerCase().includes('tesla')) {
      type = 'STOCK';
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (apiKey) {
        const symbol = market.title.toLowerCase().includes('apple') ? 'AAPL' : 'TSLA';
        const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`);
        const data = await response.json();
        const quote = data['Global Quote'];
        if (quote) {
          fetchedData = {
            symbol,
            price: Number(quote['05. price']),
            volume: Number(quote['06. volume']),
            change: quote['09. change'],
            updatedAt: new Date()
          };
        }
      }
    }

    if (fetchedData) {
      // Update market volume or liquidity pool based on real data activity
      const updatedMarket = await prisma.market.update({
        where: { id },
        data: {
          liquidityPool: type === 'STOCK' ? fetchedData.price : market.liquidityPool
        }
      });
      return res.json({ success: true, type, data: fetchedData, market: updatedMarket });
    }

    res.json({ success: false, message: 'No live data source matched for this market criteria or API key missing.' });
  } catch (error) {
    console.error('Error fetching real market data:', error);
    res.status(500).json({ error: 'Failed to fetch real-world data feed' });
  }
};
