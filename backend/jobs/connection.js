const { URL } = require('url');

const redisUrl = process.env.REDIS_URL;
let connection;

if (redisUrl) {
  try {
    const parsed = new URL(redisUrl);
    connection = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    };
  } catch (err) {
    connection = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
  }
} else {
  connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };
}

module.exports = connection;
