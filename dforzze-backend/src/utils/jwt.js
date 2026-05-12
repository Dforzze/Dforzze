const jwt = require('jsonwebtoken');
const env = require('../config/environment');

// Soporte para env.jwt.secret (legacy) y env.JWT_SECRET (actual)
const JWT_SECRET         = (env.jwt && env.jwt.secret)         || env.JWT_SECRET;
const JWT_REFRESH_SECRET = (env.jwt && env.jwt.refreshSecret)  || env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN     = (env.jwt && env.jwt.expiresIn)      || env.JWT_EXPIRES_IN     || '1h';
const JWT_REFRESH_EXPIRES_IN = (env.jwt && env.jwt.refreshExpiresIn) || env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken };
