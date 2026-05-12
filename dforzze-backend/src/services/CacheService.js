const redis = require('../config/redis');

const TTL = {
  STOCK: 60,           // 60 segundos
  PRODUCTS_LIST: 300,  // 5 minutos
  USER_SESSION: 3600,  // 1 hora
};

class CacheService {
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Cache get error:', err.message);
      return null;
    }
  }

  async set(key, value, ttl = TTL.PRODUCTS_LIST) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.error('Cache set error:', err.message);
    }
  }

  async del(key) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error('Cache del error:', err.message);
    }
  }

  async setex(key, ttl, value) {
    try {
      await redis.setex(key, ttl, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (err) {
      console.error('Cache setex error:', err.message);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error('Cache invalidatePattern error:', err.message);
    }
  }

  async getStock(productId) {
    try {
      const val = await redis.get(`stock:${productId}`);
      return val !== null ? parseInt(val, 10) : null;
    } catch (err) {
      return null;
    }
  }

  async setStock(productId, stock) {
    try {
      await redis.setex(`stock:${productId}`, TTL.STOCK, stock.toString());
    } catch (err) {
      console.error('Cache setStock error:', err.message);
    }
  }
}

module.exports = new CacheService();
module.exports.TTL = TTL;
