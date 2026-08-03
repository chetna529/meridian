// Thin Redis Pub/Sub event bus. Controllers publish domain events instead of emitting sockets
// or writing notifications inline; handlers registered here fan out to both. Swappable for a
// real broker (Kafka/RabbitMQ) later without touching call sites, since the publish/subscribe
// shape is identical.

const redis = require('redis');
const logger = require('./logger');

const CHANNEL = 'meridian-events';
const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
const CONNECT_TIMEOUT_MS = 1500;
const MAX_RECONNECT_ATTEMPTS = 5;

let publisher;
let subscriber;
const handlers = new Map(); // eventName -> array of async handlers

// Bounded retries + a connect timeout — without both, client.connect() hangs forever while
// Redis is unreachable (node-redis governs the initial connect via reconnectStrategy too).
function socketOptions() {
  return {
    reconnectStrategy: (retries) => (retries >= MAX_RECONNECT_ATTEMPTS ? new Error('Redis unavailable') : Math.min(retries * 100, 2000)),
    connectTimeout: CONNECT_TIMEOUT_MS,
    tls: redisUrl.startsWith('rediss://') ? true : undefined,
    rejectUnauthorized: redisUrl.startsWith('rediss://') ? false : undefined,
  };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function getPublisher() {
  if (!publisher) {
    publisher = redis.createClient({ url: redisUrl, socket: socketOptions() });
    publisher.on('error', (err) => logger.warn('EventBus publisher error', err.message));
  }
  return publisher;
}

async function publish(event, payload) {
  try {
    const client = getPublisher();
    if (!client.isOpen) await withTimeout(client.connect(), CONNECT_TIMEOUT_MS, 'EventBus publisher connect');
    await client.publish(CHANNEL, JSON.stringify({ event, payload }));
  } catch (err) {
    logger.warn('EventBus publish failed', err.message);
  }
}

function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, []);
  handlers.get(event).push(handler);
}

async function start() {
  try {
    subscriber = redis.createClient({ url: redisUrl, socket: socketOptions() });
    subscriber.on('error', (err) => logger.warn('EventBus subscriber error', err.message));
    await withTimeout(subscriber.connect(), CONNECT_TIMEOUT_MS, 'EventBus subscriber connect');
    await subscriber.subscribe(CHANNEL, async (message) => {
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch (err) {
        return logger.warn('EventBus: could not parse message', err.message);
      }
      const { event, payload } = parsed;
      const eventHandlers = handlers.get(event) || [];
      for (const handler of eventHandlers) {
        try {
          await handler(payload);
        } catch (err) {
          logger.warn(`EventBus handler for ${event} failed`, err.message);
        }
      }
    });
    logger.info('EventBus subscriber connected');
  } catch (err) {
    logger.warn('EventBus failed to start', err.message);
  }
}

module.exports = { publish, on, start };
