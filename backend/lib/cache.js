const redis = require('redis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
let client;

function createClient() {
  const newClient = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        const delay = Math.min(retries * 100, 2000);
        logger.info('Redis reconnect strategy', { retries, delay });
        return delay;
      },
      keepAlive: 10000,
      connectTimeout: 10000,
    },
  });

  newClient.on('connect', () => logger.info('Redis connected'));
  newClient.on('ready', () => logger.info('Redis ready'));
  newClient.on('reconnecting', () => logger.info('Redis reconnecting'));
  newClient.on('end', () => logger.warn('Redis connection closed'));
  newClient.on('error', (err) => logger.warn('Redis Client Error', err));

  return newClient;
}

async function connect() {
  if (client && client.isOpen) return client;

  if (client && !client.isOpen) {
    try {
      await client.disconnect();
    } catch (err) {
      logger.warn('Error disconnecting stale Redis client', err.message);
    }
    client = null;
  }

  client = createClient();
  try {
    await client.connect();
  } catch (err) {
    logger.warn('Redis connect failed', err.message);
  }
  return client;
}

async function get(key) {
  try {
    await connect();
    const v = await client.get(key);
    return v ? JSON.parse(v) : null;
  } catch (err) {
    logger.warn('Redis GET failed', err.message);
    return null;
  }
}

async function set(key, value, ttl = 60) {
  try {
    await connect();
    await client.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    logger.warn('Redis SET failed', err.message);
  }
}

async function del(key) {
  try {
    await connect();
    await client.del(key);
  } catch (err) {
    logger.warn('Redis DEL failed', err.message);
  }
}

async function disconnect() {
  if (client && client.isOpen) {
    try {
      await client.disconnect();
    } catch (err) {
      logger.warn('Redis disconnect failed', err.message);
    }
    client = null;
  }
}

module.exports = { connect, get, set, del };
