const { prisma } = require('../config/database');
const redis = require('../config/redis');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AuthError, ConflictError, NotFoundError } = require('../middleware/errorHandler');
const env = require('../config/environment');

class AuthService {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('El email ya está registrado');
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, rank: true, stickerCount: true, role: true, createdAt: true },
    });

    const tokenPayload = { id: user.id, email: user.email, role: user.role, rank: user.rank };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Guardar refresh token en Redis
    await redis.setex(`refresh:${user.id}`, 7 * 24 * 3600, refreshToken);

    return { user, token, refreshToken };
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthError('Credenciales inválidas');
    }

    if (user.blocked) {
      throw new AuthError('Cuenta bloqueada. Contacta al administrador.');
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new AuthError('Credenciales inválidas');
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role, rank: user.rank };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await redis.setex(`refresh:${user.id}`, 7 * 24 * 3600, refreshToken);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token, refreshToken };
  }

  async refreshToken(refreshTokenStr) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new AuthError('Refresh token inválido o expirado');
    }

    // Verificar que el refresh token en Redis coincide
    const stored = await redis.get(`refresh:${decoded.id}`);
    if (!stored || stored !== refreshTokenStr) {
      throw new AuthError('Refresh token inválido');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, rank: true, blocked: true },
    });

    if (!user || user.blocked) {
      throw new AuthError('Usuario no disponible');
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role, rank: user.rank };
    const newToken = generateToken(tokenPayload);

    return { token: newToken };
  }

  async logout(userId, token) {
    // Agregar token a lista negra en Redis (TTL = 1h, duración del token)
    await redis.setex(`blacklist:${token}`, 3600, '1');
    // Eliminar refresh token
    await redis.del(`refresh:${userId}`);
  }
}

module.exports = new AuthService();
