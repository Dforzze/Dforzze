const { prisma } = require('../config/database');
const logger = require('../utils/logger');

// Mercado Pago SDK — se carga solo si está configurado
let mpClient = null;
let MercadoPagoConfig, Preference, Payment;

function getMPClient() {
  if (mpClient) return mpClient;
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error('MP_ACCESS_TOKEN no configurado. Agrega la variable de entorno en Railway.');
  }
  try {
    const mp = require('mercadopago');
    MercadoPagoConfig = mp.MercadoPagoConfig;
    Preference = mp.Preference;
    Payment = mp.Payment;
    mpClient = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 },
    });
    return mpClient;
  } catch (err) {
    throw new Error('SDK de Mercado Pago no instalado. Ejecuta: npm install mercadopago');
  }
}

class PaymentService {
  /**
   * Crea una preferencia de pago en Mercado Pago
   * @param {Object} order - Pedido de la DB
   * @param {Object} user - Usuario autenticado
   */
  async createPreference(order, user) {
    const client = getMPClient();
    const preference = new Preference(client);

    const backendUrl = process.env.BACKEND_URL || 'https://dforzze-backend-production.up.railway.app';
    const frontendUrl = process.env.FRONTEND_URL || 'https://dforzze.com';

    // Construir items para MP
    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: { select: { name: true, images: true } } },
    });

    const mpItems = items.map(item => ({
      id: item.productId,
      title: item.product.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      currency_id: 'PEN', // Soles peruanos
      picture_url: item.product.images?.[0] || '',
    }));

    // Agregar envío como item separado
    if (parseFloat(order.shippingCost) > 0) {
      mpItems.push({
        id: 'shipping',
        title: order.shippingMethod === 'express' ? 'Envío Express' : 'Envío Estándar',
        quantity: 1,
        unit_price: parseFloat(order.shippingCost),
        currency_id: 'PEN',
      });
    }

    const preferenceData = {
      items: mpItems,
      payer: {
        name: order.shippingName || user.name || '',
        email: order.shippingEmail || user.email,
        phone: { number: order.shippingPhone || '' },
        address: {
          street_name: order.shippingAddress || '',
          city: { name: order.shippingCity || '' },
          zip_code: order.shippingZip || '',
        },
      },
      back_urls: {
        success: `${backendUrl}/api/payments/success`,
        failure: `${backendUrl}/api/payments/failure`,
        pending: `${backendUrl}/api/payments/pending`,
      },
      auto_return: 'approved',
      external_reference: order.id, // ID del pedido para identificarlo en el webhook
      notification_url: `${backendUrl}/api/payments/webhook`,
      statement_descriptor: 'DFORZZE',
      // Descuento si aplica
      ...(parseFloat(order.discount) > 0 && {
        metadata: { discount: parseFloat(order.discount) },
      }),
    };

    const result = await preference.create({ body: preferenceData });
    logger.info(`✅ Preferencia MP creada: ${result.id} para pedido ${order.id}`);
    return result;
  }

  /**
   * Procesa notificación de pago del webhook de MP
   * @param {string} paymentId - ID del pago en MP
   */
  async processPaymentNotification(paymentId) {
    const client = getMPClient();
    const paymentClient = new Payment(client);

    // Obtener detalles del pago
    const payment = await paymentClient.get({ id: paymentId });
    logger.info(`💳 Pago MP: id=${paymentId} status=${payment.status} order=${payment.external_reference}`);

    const orderId = payment.external_reference;
    if (!orderId) {
      logger.warn('Webhook sin external_reference');
      return;
    }

    // Actualizar estado del pedido según el pago
    let newStatus;
    if (payment.status === 'approved') {
      newStatus = 'CONFIRMED';
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      newStatus = 'CANCELLED';
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      newStatus = 'PENDING';
    }

    if (newStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          paymentId: String(paymentId),
          paymentMethod: payment.payment_method_id || 'mercadopago',
          paidAt: payment.status === 'approved' ? new Date() : null,
        },
      });
      logger.info(`✅ Pedido ${orderId} actualizado a ${newStatus}`);
    }
  }
}

module.exports = new PaymentService();
