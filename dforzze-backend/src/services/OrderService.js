const { prisma } = require('../config/database');
const inventoryService = require('./InventoryService');
const stickerService = require('./StickerService');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SHIPPING_COSTS = { standard: 9, express: 12 };

class OrderService {
  /**
   * Calcula la cantidad de stickers según el monto de compra
   * S/. 100+ = 1 | S/. 200+ = 2 | S/. 400+ = 3
   */
  calculateStickers(amount) {
    if (amount >= 400) return 3;
    if (amount >= 200) return 2;
    if (amount >= 100) return 1;
    return 0;
  }

  /**
   * Crea un pedido con validación atómica de stock
   */
  async createOrder(userId, orderData) {
    const { items, shipping, shippingMethod, couponCode } = orderData;

    // 1. Obtener productos y calcular subtotal
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundError('Uno o más productos no encontrados o no disponibles');
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    const enrichedItems = items.map(item => {
      const product = productMap.get(item.productId);
      const lineTotal = parseFloat(product.price) * item.quantity;
      subtotal += lineTotal;
      return { ...item, price: parseFloat(product.price), lineTotal };
    });

    // 2. Aplicar cupón si existe
    let discount = 0;
    let validatedCoupon = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase(), active: true, type: 'discount' },
      });
      if (!coupon) {
        throw new ValidationError('Código de descuento inválido o ya utilizado');
      }
      discount = Math.round(subtotal * coupon.value / 100);
      validatedCoupon = coupon;
    }

    // 3. Calcular envío y total
    const shippingCost = SHIPPING_COSTS[shippingMethod] || 10;
    const total = subtotal - discount + shippingCost;

    // 4. Calcular stickers a ganar
    const stickersEarned = this.calculateStickers(subtotal);

    // 5. Crear pedido en DB (sin reservar stock aún)
    const order = await prisma.order.create({
      data: {
        userId,
        subtotal,
        discount,
        shippingCost,
        total,
        shippingMethod,
        couponCode: couponCode?.toUpperCase() || null,
        stickersEarned,
        shippingName: shipping.name,
        shippingEmail: shipping.email,
        shippingPhone: shipping.phone || null,
        shippingAddress: shipping.address,
        shippingCity: shipping.city,
        shippingDistrict: shipping.district || null,
        shippingZip: shipping.zip || null,
        shippingCountry: shipping.country || 'PE',
        items: {
          create: enrichedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    // 6. Reservar stock atómicamente (puede lanzar StockError)
    try {
      await inventoryService.validateAndReserveStock(
        enrichedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
        order.id,
        userId
      );
    } catch (err) {
      // Cancelar el pedido si falla el stock
      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      throw err;
    }

    // 7. Marcar cupón como usado
    if (validatedCoupon) {
      await prisma.coupon.update({
        where: { id: validatedCoupon.id },
        data: { active: false, usedBy: userId, usedAt: new Date() },
      });
    }

    // 8. Asignar stickers si corresponde
    if (stickersEarned > 0) {
      try {
        await stickerService.assignStickers(userId, stickersEarned, order.id);
      } catch (err) {
        logger.error('Error asignando stickers:', err.message);
      }
    }

    logger.info(`✅ Pedido creado: ${order.id} | Total: S/. ${total} | Stickers: ${stickersEarned}`);

    return {
      order: {
        ...order,
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        shippingCost: parseFloat(order.shippingCost),
        total: parseFloat(order.total),
      },
    };
  }

  /**
   * Lista pedidos (del usuario o todos si es admin)
   */
  async getOrders(userId, isAdmin, { status, page = 1, limit = 20 }) {
    const where = {};
    if (!isAdmin) where.userId = userId;
    if (status) where.status = status.toUpperCase();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { name: true, images: true } } },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(o => ({
        ...o,
        subtotal: parseFloat(o.subtotal),
        discount: parseFloat(o.discount),
        shippingCost: parseFloat(o.shippingCost),
        total: parseFloat(o.total),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Obtiene un pedido por ID
   */
  async getOrderById(orderId, userId, isAdmin) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { select: { name: true, images: true, price: true } } },
        },
      },
    });

    if (!order) throw new NotFoundError('Pedido no encontrado');
    if (!isAdmin && order.userId !== userId) throw new NotFoundError('Pedido no encontrado');

    return {
      ...order,
      subtotal: parseFloat(order.subtotal),
      discount: parseFloat(order.discount),
      shippingCost: parseFloat(order.shippingCost),
      total: parseFloat(order.total),
    };
  }
}

module.exports = new OrderService();
