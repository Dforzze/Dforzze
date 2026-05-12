const { prisma } = require('../config/database');
const logger = require('../utils/logger');

// Reglas de stickers: S/. 100+ = 1, S/. 200+ = 2, S/. 400+ = 3
const STICKER_THRESHOLDS = [
  { min: 400, count: 3 },
  { min: 200, count: 2 },
  { min: 100, count: 1 },
];

// Rangos según stickers
const RANK_THRESHOLDS = [
  { min: 21, rank: 'INNER' },
  { min: 14, rank: 'BUILDER' },
  { min: 7, rank: 'INITIATED' },
  { min: 0, rank: 'NONE' },
];

class StickerService {
  /**
   * Calcula el rank según el conteo de stickers
   */
  calculateRank(stickerCount) {
    for (const { min, rank } of RANK_THRESHOLDS) {
      if (stickerCount >= min) return rank;
    }
    return 'NONE';
  }

  /**
   * Asigna stickers a un usuario después de una compra
   */
  async assignStickers(userId, count, orderId = null) {
    if (count <= 0) return [];

    const stickers = [];
    const stickerData = [
      { name: 'Sakura — Colección 01', emoji: '🌸', drop: 'Colección 01 — Sakura' },
      { name: 'Wave — Colección 01', emoji: '🌊', drop: 'Colección 01 — Sakura' },
      { name: 'Fire — Colección 01', emoji: '🔥', drop: 'Colección 01 — Sakura' },
    ];

    for (let i = 0; i < count; i++) {
      const sticker = stickerData[i % stickerData.length];
      const created = await prisma.sticker.create({
        data: {
          userId,
          name: sticker.name,
          emoji: sticker.emoji,
          drop: sticker.drop,
          pts: 1,
          type: 'purchase',
          orderId,
        },
      });
      stickers.push(created);
    }

    // Actualizar conteo y rank del usuario
    await this.updateUserRank(userId);

    logger.info(`🎴 ${count} stickers asignados a usuario ${userId}`);
    return stickers;
  }

  /**
   * Actualiza el rank del usuario según sus stickers
   */
  async updateUserRank(userId) {
    const stickerCount = await prisma.sticker.count({
      where: { userId },
    });

    const newRank = this.calculateRank(stickerCount);

    await prisma.user.update({
      where: { id: userId },
      data: { stickerCount, rank: newRank },
    });

    return { stickerCount, rank: newRank };
  }

  /**
   * Obtiene la colección de stickers de un usuario
   */
  async getUserStickers(userId) {
    const stickers = await prisma.sticker.findMany({
      where: { userId },
      orderBy: { redeemedAt: 'desc' },
    });

    // Agrupar por tipo
    const grouped = {};
    stickers.forEach(s => {
      if (!grouped[s.name]) {
        grouped[s.name] = { ...s, count: 0 };
      }
      grouped[s.name].count++;
    });

    return {
      stickers,
      grouped: Object.values(grouped),
      total: stickers.length,
    };
  }

  /**
   * Canjea un código de sticker
   */
  async redeemCode(userId, code) {
    const sticker = await prisma.sticker.findFirst({
      where: { code: code.toUpperCase(), type: 'code' },
    });

    if (!sticker) {
      throw new Error('Código inválido o ya canjeado');
    }

    if (sticker.userId !== null && sticker.userId !== userId) {
      throw new Error('Este código ya fue canjeado por otro usuario');
    }

    // Asignar al usuario
    const updated = await prisma.sticker.update({
      where: { id: sticker.id },
      data: {
        userId,
        redeemedAt: new Date(),
        type: 'redeemed',
      },
    });

    // Actualizar rank
    await this.updateUserRank(userId);

    logger.info(`🎴 Código canjeado: ${code} por usuario ${userId}`);
    return updated;
  }

  /**
   * Genera un código de sticker (admin)
   */
  async generateCode(adminId, stickerData = {}) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DFZ-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const sticker = await prisma.sticker.create({
      data: {
        userId: null, // Sin asignar hasta canjear
        name: stickerData.name || 'Sakura — Colección 01',
        emoji: stickerData.emoji || '🌸',
        drop: stickerData.drop || 'Colección 01 — Sakura',
        pts: 1,
        type: 'code',
        code,
      },
    });

    logger.info(`🎴 Código generado: ${code}`);
    return sticker;
  }

  /**
   * Sincroniza stickers desde localStorage (migración)
   */
  async syncFromLocalStorage(userId, stickers) {
    if (!Array.isArray(stickers) || stickers.length === 0) return { synced: 0 };

    let synced = 0;
    for (const s of stickers) {
      // Verificar si ya existe
      const existing = await prisma.sticker.findFirst({
        where: { userId, name: s.name, emoji: s.emoji },
      });

      if (!existing) {
        await prisma.sticker.create({
          data: {
            userId,
            name: s.name || 'Sakura — Colección 01',
            emoji: s.emoji || '🌸',
            drop: s.drop || 'Colección 01 — Sakura',
            pts: 1,
            type: 'migrated',
          },
        });
        synced++;
      }
    }

    // Actualizar rank
    if (synced > 0) {
      await this.updateUserRank(userId);
    }

    logger.info(`🎴 ${synced} stickers sincronizados para usuario ${userId}`);
    return { synced };
  }
}

module.exports = new StickerService();
