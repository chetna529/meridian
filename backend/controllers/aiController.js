const Groq = require("groq-sdk");
const prisma = require('../lib/prisma');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'mock-api-key-if-missing' 
});

exports.summarizeMarket = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    // In a real app we'd fetch actual sentiment/volume
    const sentiment = {
      yesPercentage: market.yesPercentage,
      noPercentage: market.noPercentage,
      totalVolume: market.totalVolume,
      trend: market.yesPercentage > 50 ? 'BULLISH' : 'BEARISH'
    };

    const prompt = `
      Market: ${market.title}
      Description: ${market.description}
      Category: ${market.category}
      Current Sentiment: ${sentiment.yesPercentage}% YES, ${sentiment.noPercentage}% NO
      Total Volume: $${sentiment.totalVolume}
      
      Provide a concise market summary with:
      1. Market overview (1-2 sentences)
      2. Key factors to consider (3 points)
      3. Current market sentiment
      4. Closing suggestion (YES/NO/NEUTRAL)
      
      Keep it actionable and avoid financial advice.
    `;

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a market analyst. Provide insights on prediction markets." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      return res.json({
        summary: response.choices[0].message.content,
        sentiment: sentiment,
        generatedAt: new Date()
      });
    } catch (groqError) {
      console.error("Groq API Error:", groqError);
      return res.json({
        summary: "AI Analysis currently unavailable. Please check API Key.",
        sentiment: sentiment,
        generatedAt: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to summarize market' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { id } = req.params;
    const { userMessage, conversationHistory } = req.body;
    
    const market = await prisma.market.findUnique({ where: { id } });
    
    const systemPrompt = `
      You are a helpful prediction market assistant for the market: "${market.title}"
      Description: ${market.description}
      Current sentiment: ${market.yesPercentage}% YES
      Total volume: $${market.totalVolume}
      
      Help users understand:
      1. Market mechanics and odds
      2. How to evaluate predictions
      3. Risk management strategies
      Provide data-driven insights. Do NOT provide financial advice.
    `;
    
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      res.json({
        message: response.choices[0].message.content,
        timestamp: new Date()
      });
    } catch (groqError) {
       res.json({
        message: "AI Chatbot is currently offline (Check Groq API Key).",
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to chat' });
  }
};

exports.assessRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });
    
    const riskFactors = {
      timeRemaining: market.resolutionDate < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) ? 'HIGH' : 'LOW',
      volume: Number(market.totalVolume) < 1000 ? 'HIGH' : 'LOW',
      clarity: market.description.length < 100 ? 'MEDIUM' : 'LOW',
      resolutionCriteria: market.resolutionCriteria ? 'LOW' : 'HIGH'
    };
    
    // Simple heuristic
    let highCount = Object.values(riskFactors).filter(v => v === 'HIGH').length;
    const overallRisk = highCount >= 2 ? 'HIGH' : (highCount === 1 ? 'MEDIUM' : 'LOW');
    
    res.json({
      overallRisk,
      riskFactors,
      recommendation: `This market has ${overallRisk} risk.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assess risk' });
  }
};

// Recommendation engine: finds similar markets in the same category
exports.getRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    const recommended = await prisma.market.findMany({
      where: {
        category: market.category,
        id: { not: id },
        status: 'LIVE'
      },
      take: 3
    });

    res.json(recommended);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
};

// Fetch news related to the market title and summarize using Groq
exports.getNewsSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const market = await prisma.market.findUnique({ where: { id } });
    if (!market) return res.status(404).json({ error: 'Market not found' });

    // Try fetching from public news API, fallback to mock news if not configured or limits hit
    let articles = [];
    try {
      const newsApiKey = process.env.NEWS_API_KEY;
      if (newsApiKey) {
        const query = encodeURIComponent(market.title);
        const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&pageSize=3&apiKey=${newsApiKey}`);
        const data = await response.json();
        if (data.articles) {
          articles = data.articles.map(a => ({
            title: a.title,
            description: a.description,
            url: a.url
          }));
        }
      }
    } catch (e) {
      console.warn('NewsAPI fetch failed or skipped, using fallback mock news:', e.message);
    }

    if (articles.length === 0) {
      articles = [
        {
          title: `Latest developments on: ${market.title}`,
          description: `Analysis and forecasts regarding ${market.description.substring(0, 100)}...`,
          url: 'https://news.google.com'
        },
        {
          title: `Market dynamics for ${market.category} predictions`,
          description: `Volume and odds fluctuations observed globally in recent prediction activity.`,
          url: 'https://news.google.com'
        }
      ];
    }

    const textToSummarize = articles.map(a => `${a.title}: ${a.description}`).join('\n\n');

    let summary = 'AI news summary currently unavailable.';
    let sentiment = 'NEUTRAL';

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a news analyst. Summarize articles concisely and output the overall sentiment (BULLISH/BEARISH/NEUTRAL) on the last line like: Sentiment: BULLISH'
          },
          {
            role: 'user',
            content: `Summarize the following news articles in relation to: "${market.title}".\n\n${textToSummarize}`
          }
        ],
        temperature: 0.5,
        max_tokens: 250
      });

      const responseText = response.choices[0].message.content;
      summary = responseText;
      if (responseText.toUpperCase().includes('BULLISH')) sentiment = 'BULLISH';
      else if (responseText.toUpperCase().includes('BEARISH')) sentiment = 'BEARISH';
    } catch (groqError) {
      console.error('Groq summary failed:', groqError);
    }

    res.json({
      articles,
      summary,
      sentiment
    });
  } catch (error) {
    console.error('Error in getNewsSummary:', error);
    res.status(500).json({ error: 'Failed to fetch news summary' });
  }
};
