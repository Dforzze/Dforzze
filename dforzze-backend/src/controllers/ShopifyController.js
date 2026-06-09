const crypto = require('crypto');
const { prisma } = require('../config/database');
const stickerService = require('../services/StickerService');
const logger = require('../utils/logger');

// Cuántos stickers gana según el subtotal de la orden
function calculateStickers(amount) {
  if (amount >= 400) return 3;
  if (amount >= 200) return 2;
  if (amount >= 100) return 1;
  return 0;
}

class ShopifyController {
  /**
   * POST /api/shopify/webhook/orders-paid
   * Shopify manda este evento cada vez que una orden es pagada.
   * Verifica la firma HMAC antes de procesar.
   */
  async orderPaid(req, res) {
    // ── 1. Verificar firma HMAC de Shopify ─────────────────────────
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('SHOPIFY_WEBHOOK_SECRET no configurado');
      return res.status(500).json({ error: 'Webhook no configurado' });
    }

    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    if (!hmacHeader) {
      logger.warn('Webhook sin firma HMAC');
      return res.status(401).json({ error: 'Sin firma' });
    }

    const rawBody = req.body; // Buffer gracias a express.raw()
    const digest = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const valid = crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmacHeader)
    );

    if (!valid) {
      logger.warn('Firma HMAC inválida en webhook de Shopify');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    // ── 2. Parsear el payload ──────────────────────────────────────
    let order;
    try {
      order = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      logger.error('Error parseando webhook payload:', e.message);
      return res.status(400).json({ error: 'Payload inválido' });
    }

    // Responder a Shopify de inmediato (max 5 seg o reintenta)
    res.status(200).json({ received: true });

    // ── 3. Procesar en background ──────────────────────────────────
    setImmediate(async () => {
      try {
        const email = order.email?.toLowerCase?.();
        const subtotal = parseFloat(order.subtotal_price || order.total_price || '0');
        const shopifyOrderId = String(order.id);

        if (!email) {
          logger.warn(`Webhook orden ${shopifyOrderId} sin email — ignorado`);
          return;
        }

        logger.info(`🛍 Shopify orden pagada: ${shopifyOrderId} | email: ${email} | S/. ${subtotal}`);

        // Calcular stickers
        const stickersEarned = calculateStickers(subtotal);
        if (stickersEarned === 0) {
          logger.info(`Orden ${shopifyOrderId} no alcanza umbral de stickers (S/. ${subtotal})`);
          return;
        }

        // Buscar usuario por email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          logger.info(`Usuario con email ${email} no encontrado en DB — stickers no asignados`);
          return;
        }

        // Evitar duplicar stickers por la misma orden de Shopify
        const alreadyProcessed = await prisma.sticker.findFirst({
          where: { userId: user.id, orderId: shopifyOrderId },
        });
        if (alreadyProcessed) {
          logger.info(`Orden Shopify ${shopifyOrderId} ya procesada — skip`);
          return;
        }

        // Asignar stickers y actualizar rango
        await stickerService.assignStickers(user.id, stickersEarned, shopifyOrderId);

        const { stickerCount, rank } = await stickerService.updateUserRank(user.id);

        logger.info(
          `✅ ${stickersEarned} stickers asignados a ${email} | Total: ${stickerCount} | Rango: ${rank}`
        );
      } catch (err) {
        logger.error('Error procesando webhook Shopify:', err.message);
      }
    });
  }
}

module.exports = new ShopifyController();
