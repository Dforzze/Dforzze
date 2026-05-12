const stickerService = require('../services/StickerService');
const { ValidationError } = require('../middleware/errorHandler');

class StickerController {
  /**
   * GET /api/stickers/my-collection
   * Obtiene la colección de stickers del usuario autenticado
   */
  async getMyCollection(req, res, next) {
    try {
      const result = await stickerService.getUserStickers(req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/stickers/redeem
   * Canjea un código de sticker
   */
  async redeemCode(req, res, next) {
    try {
      const { code } = req.body;
      if (!code) {
        throw new ValidationError('Código requerido');
      }

      const sticker = await stickerService.redeemCode(req.user.id, code);
      res.json({
        success: true,
        data: sticker,
        message: `¡Sticker canjeado! ${sticker.emoji} ${sticker.name}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/stickers/generate-code
   * Genera un código de sticker (solo admin)
   */
  async generateCode(req, res, next) {
    try {
      const { name, emoji, drop } = req.body;
      const sticker = await stickerService.generateCode(req.user.id, { name, emoji, drop });
      res.json({
        success: true,
        data: sticker,
        message: `Código generado: ${sticker.code}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/stickers/sync
   * Sincroniza stickers desde localStorage (migración)
   */
  async syncStickers(req, res, next) {
    try {
      const { stickers } = req.body;
      const result = await stickerService.syncFromLocalStorage(req.user.id, stickers);
      res.json({
        success: true,
        data: result,
        message: `${result.synced} stickers sincronizados`,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StickerController();
