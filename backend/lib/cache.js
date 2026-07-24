const redis = require('redis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
const CONNECT_TIMEOUT_MS = 1500;
const MAX_RECONNECT_ATTEMPTS = 5;
let client;

function createClient() {
  const newClient = redis.createClient({
    url: redisUrl,
    socket: {
      // Give up after a few attempts instead of retrying forever — every cache.get/set/del
      // call would otherwise hang indefinitely (never resolving or rejecting) while Redis is
      // unreachable, taking the whole API down with it.
      reconnectStrategy: (retries) => {
        if (retries >= MAX_RECONNECT_ATTEMPTS) {
          logger.warn('Redis reconnect attempts exhausted, giving up', { retries });
          return new Error('Redis unavailable, giving up reconnect attempts');
        }
        const delay = Math.min(retries * 100, 2000);
        return delay;
      },
      keepAlive: 10000,
      connectTimeout: CONNECT_TIMEOUT_MS,
    },
  });

  newClient.on('connect', () => logger.info('Redis connected'));
  newClient.on('ready', () => logger.info('Redis ready'));
  newClient.on('reconnecting', () => logger.info('Redis reconnecting'));
  newClient.on('end', () => logger.warn('Redis connection closed'));
  newClient.on('error', (err) => logger.warn('Redis Client Error', err.message));

  return newClient;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
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
    await withTimeout(client.connect(), CONNECT_TIMEOUT_MS, 'Redis connect');
  } catch (err) {
    logger.warn('Redis connect failed', err.message);
  }
  return client;
}

async function get(key) {
  try {
    await connect();
    if (!client.isOpen) return null;
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
    if (!client.isOpen) return;
    await client.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    logger.warn('Redis SET failed', err.message);
  }
}

async function del(key) {
  try {
    await connect();
    if (!client.isOpen) return;
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
