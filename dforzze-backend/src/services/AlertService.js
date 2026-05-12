const { prisma } = require('../config/database');
const logger = require('../utils/logger');

class AlertService {
  /**
   * Obtiene todas las alertas con filtros
   */
  async getAlerts({ acknowledged, type, productId, page = 1, limit = 50 }) {
    const where = {};
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';
    if (type) where.type = type;
    if (productId) where.productId = productId;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, stock: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts: alerts.map(a => ({
        ...a,
        productName: a.product?.name,
        currentStock: a.product?.stock,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Marca una alerta como reconocida
   */
  async acknowledgeAlert(alertId) {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: { acknowledged: true },
    });
    logger.info(`✅ Alerta reconocida: ${alertId}`);
    return alert;
  }

  /**
   * Crea alerta de stock bajo
   */
  async createLowStockAlert(productId, currentStock, threshold, productName) {
    try {
      // Verificar si ya existe una alerta activa para este producto
      const existing = await prisma.alert.findFirst({
        where: { productId, acknowledged: false, type: 'low_stock' },
      });
      if (existing) {
        logger.debug(`Alerta ya existe para ${productName}`);
        return existing;
      }

      const alert = await prisma.alert.create({
        data: {
          productId,
          type: 'low_stock',
          message: `${productName} tiene ${currentStock} unidades (umbral: ${threshold})`,
          metadata: { currentStock, threshold },
        },
      });
      logger.warn(`⚠️ Alerta creada: ${productName} (${currentStock} unidades)`);
      return alert;
    } catch (err) {
      logger.error('Error creando alerta:', err.message);
      throw err;
    }
  }

  /**
   * Limpia alertas de un producto cuando recibe restock
   */
  async clearAlertsForProduct(productId) {
    const result = await prisma.alert.updateMany({
      where: { productId, acknowledged: false },
      data: { acknowledged: true },
    });
    if (result.count > 0) {
      logger.info(`🧹 ${result.count} alertas limpiadas para producto ${productId}`);
    }
    return result;
  }

  /**
   * Obtiene conteo de alertas no reconocidas
   */
  async getUnacknowledgedCount() {
    return await prisma.alert.count({
      where: { acknowledged: false },
    });
  }

  /**
   * Obtiene alertas agrupadas por tipo
   */
  async getAlertsSummary() {
    const [lowStock, outOfStock, total] = await Promise.all([
      prisma.alert.count({
        where: { type: 'low_stock', acknowledged: false },
      }),
      prisma.alert.count({
        where: { type: 'out_of_stock', acknowledged: false },
      }),
      prisma.alert.count({
        where: { acknowledged: false },
      }),
    ]);

    return { lowStock, outOfStock, total };
  }
}

module.exports = new AlertService();
