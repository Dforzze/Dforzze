const { verifyToken } = require('../utils/jwt');
const redis = require('../config/redis');
const { AuthError } = require('./errorHandler');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Token de acceso requerido');
    }

    const token = authHeader.split(' ')[1];

    // Verificar si el token está en la lista negra
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthError('Token revocado');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AuthError('Token inválido o expirado'));
    }
    next(err);
  }
}

module.exports = auth;
