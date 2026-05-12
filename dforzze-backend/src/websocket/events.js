const { getIO } = require('../config/socket');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Emite actualización de stock a todos los clientes suscritos al producto
 * y a todos los clientes en general (para actualizar catálogos)
 */
async function broadcastStockUpdate(productId) {
  const io = getIO();
  if (!io) return;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
    });

    if (!product) return;

    const status = product.stock === 0 ? 'out_of_stock'
      : product.stock <= product.lowStockThreshold ? 'low'
      : 'available';

    const payload = {
      productId: product.id,
      productName: product.name,
      stock: product.stock,
      status,
      timestamp: new Date().toISOString(),
    };

    // Emitir a sala del producto específico
    io.to(`product:${productId}`).emit('stock_update', payload);

    // Emitir a todos los clientes (para catálogo)
    io.emit('stock_update', payload);

    logger.debug(`📡 Stock broadcast: ${product.name} → ${product.stock} (${status})`);
  } catch (err) {
    logger.error('Error en broadcastStockUpdate:', err.message);
  }
}

/**
 * Emite confirmación de pedido al usuario específico
 */
function broadcastOrderConfirmation(userId, orderData) {
  const io = getIO();
  if (!io) return;

  io.to(`user:${userId}`).emit('order_confirmed', orderData);
}

module.exports = { broadcastStockUpdate, broadcastOrderConfirmation };
