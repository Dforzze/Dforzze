const logger = require('../utils/logger');

// Redis es opcional — si no hay REDIS_URL, usamos un mock en memoria
let client = null;

if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL;

    const redisOptions = {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 300, 3000);
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      },
    };

    // Railway usa rediss:// (SSL) — configurar TLS
    if (redisUrl.startsWith('rediss://')) {
      redisOptions.tls = { rejectUnauthorized: false };
    }

    client = new Redis(redisUrl, redisOptions);

    client.on('connect', () => logger.info('✅ Redis conectado'));
    client.on('ready', () => logger.info('✅ Redis listo'));
    client.on('error', (err) => {
      logger.warn('⚠️ Redis error:', err.message);
    });
  } catch (err) {
    logger.warn('⚠️ ioredis no disponible, usando cache en memoria:', err.message);
    client = null;
  }
}

// Cache en memoria como fallback
const memCache = new Map();

const mockClient = {
  get: async (key) => memCache.get(key) ?? null,
  set: async (key, val) => { memCache.set(key, val); return 'OK'; },
  setex: async (key, ttl, val) => {
    memCache.set(key, val);
    setTimeout(() => memCache.delete(key), ttl * 1000);
    return 'OK';
  },
  del: async (key) => { memCache.delete(key); return 1; },
  keys: async (pattern) => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...memCache.keys()].filter(k => regex.test(k));
  },
  quit: () => {},
  on: () => {},
};

// Wrapper seguro — cae al mock si Redis falla
const safeClient = {
  get: async (key) => {
    try { return client ? await client.get(key) : await mockClient.get(key); }
    catch { return await mockClient.get(key); }
  },
  set: async (key, val) => {
    try { return client ? await client.set(key, val) : await mockClient.set(key, val); }
    catch { return await mockClient.set(key, val); }
  },
  setex: async (key, ttl, val) => {
    try { return client ? await client.setex(key, ttl, val) : await mockClient.setex(key, ttl, val); }
    catch { return await mockClient.setex(key, ttl, val); }
  },
  del: async (key) => {
    try { return client ? await client.del(key) : await mockClient.del(key); }
    catch { return await mockClient.del(key); }
  },
  keys: async (pattern) => {
    try { return client ? await client.keys(pattern) : await mockClient.keys(pattern); }
    catch { return await mockClient.keys(pattern); }
  },
  quit: () => { try { if (client) client.quit(); } catch {} },
  on: (event, cb) => { try { if (client) client.on(event, cb); } catch {} },
};

module.exports = safeClient;
