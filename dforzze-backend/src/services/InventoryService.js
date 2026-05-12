const { prisma } = require('../config/database');
const cache = require('./CacheService');
const { NotFoundError, StockError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// broadcastStockUpdate se inyecta después de inicializar Socket.io
let _broadcastFn = null;
function setBroadcast(fn) { _broadcastFn = fn; }

class InventoryService {
  /**
   * Valida y reserva stock en una transacción atómica.
   * Usa SELECT FOR UPDATE para prevenir race conditions.
   */
  async validateAndReserveStock(items, orderId, userId) {
    return await prisma.$transaction(async (tx) => {
      const reservedItems = [];
      const errors = [];

      // Ordenar items por productId para prevenir deadlocks
      const sortedItems = [...items].sort((a, b) =>
        a.productId.localeCompare(b.productId)
      );

      for (const item of sortedItems) {
        // SELECT FOR UPDATE bloquea la fila durante la transacción
        const products = await tx.$queryRaw`
          SELECT id, name, stock, price
          FROM products
          WHERE id = ${item.productId}::uuid
          FOR UPDATE
        `;

        if (!products || products.length === 0) {
          errors.push({ productId: item.productId, error: 'Producto no encontrado' });
          continue;
        }

        const p = products[0];

        if (p.stock < item.quantity) {
          errors.push({
            productId: item.productId,
            productName: p.name,
            available: p.stock,
            requested: item.quantity,
            error: 'Stock insuficiente',
          });
          continue;
        }

        // Actualizar stock
        await tx.$executeRaw`
          UPDATE products
          SET stock = stock - ${item.quantity},
              updated_at = NOW()
          WHERE id = ${item.productId}::uuid
        `;

        // Registrar movimiento
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'PURCHASE',
            quantity: -item.quantity,
            previousStock: p.stock,
            newStock: p.stock - item.quantity,
            orderId,
            userId,
            reason: 'Venta confirmada',
          },
        });

        reservedItems.push({
          productId: item.productId,
          productName: p.name,
          quantity: item.quantity,
          price: parseFloat(p.price),
          newStock: p.stock - item.quantity,
        });
      }

      if (errors.length > 0) {
        throw new StockError('Stock insuficiente para uno o más productos', errors);
      }

      return { success: true, reservedItems };
    }, {
      maxWait: 5000,
      timeout: 10000,
    }).then(async (result) => {
      // Invalidar cache y broadcast DESPUÉS del commit
      for (const item of result.reservedItems) {
        await this.invalidateStockCache(item.productId);
        // Verificar si necesita alerta de stock bajo
        await this._checkLowStockAlert(item.productId, item.newStock);
      }
      return result;
    });
  }

  /**
   * Invalida el cache de stock en Redis y emite broadcast WebSocket
   */
  async invalidateStockCache(productId) {
    await cache.del(`stock:${productId}`);
    await cache.del(`product:${productId}`);
    await cache.invalidatePattern('products:list:*');

    if (_broadcastFn) {
      _broadcastFn(productId);
    }
  }

  /**
   * Obtiene stock actual con cache Redis
   */
  async getStock(productId) {
    const cached = await cache.getStock(productId);
    if (cached !== null) return cached;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });

    if (!product) throw new NotFoundError('Producto no encontrado');

    await cache.setStock(productId, product.stock);
    return product.stock;
  }

  /**
   * Actualiza stock manualmente (admin)
   */
  async updateStock(productId, newStock, reason, userId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError('Producto no encontrado');

    const previousStock = product.stock;
    const quantity = newStock - previousStock;

    const movementType = quantity > 0 ? 'RESTOCK' : reason === 'return' ? 'RETURN' : reason === 'damage' ? 'DAMAGE' : 'ADJUSTMENT';

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock, updatedAt: new Date() },
      }),
      prisma.inventoryMovement.create({
        data: {
          productId,
          type: movementType,
          quantity,
          previousStock,
          newStock,
          userId,
          reason,
        },
      }),
    ]);

    await this.invalidateStockCache(productId);

    // Verificar alertas
    if (newStock <= product.lowStockThreshold && previousStock > product.lowStockThreshold) {
      await this._createLowStockAlert(productId, newStock, product.lowStockThreshold, product.name);
    } else if (newStock > product.lowStockThreshold) {
      // Limpiar alertas si el stock se recuperó
      await prisma.alert.updateMany({
        where: { productId, acknowledged: false },
        data: { acknowledged: true },
      });
    }

    return {
      product: { ...updatedProduct, price: parseFloat(updatedProduct.price) },
      movement,
    };
  }

  /**
   * Crea alerta de stock bajo
   */
  async _createLowStockAlert(productId, currentStock, threshold, productName) {
    try {
      // Verificar si ya existe una alerta activa
      const existing = await prisma.alert.findFirst({
        where: { productId, acknowledged: false, type: 'low_stock' },
      });
      if (existing) return;

      await prisma.alert.create({
        data: {
          productId,
          type: 'low_stock',
          message: `${productName} tiene ${currentStock} unidades (umbral: ${threshold})`,
          metadata: { currentStock, threshold },
        },
      });
      logger.warn(`⚠️ Stock bajo: ${productName} (${currentStock} unidades)`);
    } catch (err) {
      logger.error('Error creando alerta de stock:', err.message);
    }
  }

  /**
   * Verifica y crea alerta si el stock está bajo
   */
  async _checkLowStockAlert(productId, newStock) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { lowStockThreshold: true, name: true },
      });
      if (product && newStock <= product.lowStockThreshold) {
        await this._createLowStockAlert(productId, newStock, product.lowStockThreshold, product.name);
      }
    } catch (err) {
      logger.error('Error verificando alerta de stock:', err.message);
    }
  }

  /**
   * Obtiene historial de movimientos con filtros y paginación
   */
  async getMovements({ productId, type, startDate, endDate, page = 1, limit = 50 }) {
    const where = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return {
      movements: movements.map(m => ({
        ...m,
        productName: m.product?.name,
        userName: m.user?.name,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Exporta movimientos a CSV
   */
  async exportMovementsCSV(filters) {
    const { movements } = await this.getMovements({ ...filters, limit: 10000 });

    const headers = ['ID', 'Producto', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Pedido', 'Usuario', 'Motivo', 'Fecha'];
    const rows = movements.map(m => [
      m.id,
      m.productName || '',
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.orderId || '',
      m.userName || '',
      m.reason || '',
      new Date(m.createdAt).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }
}

module.exports = new InventoryService();
module.exports.setBroadcast = setBroadcast;
