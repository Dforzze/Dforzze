const paymentService = require('../services/PaymentService');
const orderService = require('../services/OrderService');
const logger = require('../utils/logger');

class PaymentController {
  /**
   * Crea una preferencia de pago en Mercado Pago
   * El frontend llama esto antes de redirigir al checkout de MP
   */
  async createPreference(req, res, next) {
    try {
      const { orderData } = req.body;
      if (!orderData) {
        return res.status(400).json({ success: false, error: 'orderData es requerido' });
      }

      // 1. Crear el pedido en la DB primero
      const orderResult = await orderService.createOrder(req.user.id, orderData);
      const order = orderResult.order;

      // 2. Crear preferencia en Mercado Pago
      const preference = await paymentService.createPreference(order, req.user);

      res.json({
        success: true,
        data: {
          preferenceId: preference.id,
          initPoint: preference.init_point,       // URL producción
          sandboxInitPoint: preference.sandbox_init_point, // URL sandbox
          orderId: order.id,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Webhook que Mercado Pago llama cuando hay un pago
   */
  async webhook(req, res) {
    try {
      const { type, data } = req.body;
      logger.info(`📩 Webhook MP: type=${type} id=${data?.id}`);

      if (type === 'payment') {
        await paymentService.processPaymentNotification(data.id);
      }

      res.sendStatus(200);
    } catch (err) {
      logger.error('Error en webhook MP:', err.message);
      res.sendStatus(200); // Siempre 200 para que MP no reintente
    }
  }

  /**
   * Página de retorno — pago exitoso
   */
  success(req, res) {
    const { external_reference, payment_id } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'https://dforzze.com';
    res.redirect(`${frontendUrl}/checkout.html?payment=success&order=${external_reference}&payment_id=${payment_id}`);
  }

  /**
   * Página de retorno — pago fallido
   */
  failure(req, res) {
    const { external_reference } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'https://dforzze.com';
    res.redirect(`${frontendUrl}/checkout.html?payment=failure&order=${external_reference}`);
  }

  /**
   * Página de retorno — pago pendiente
   */
  pending(req, res) {
    const { external_reference } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'https://dforzze.com';
    res.redirect(`${frontendUrl}/checkout.html?payment=pending&order=${external_reference}`);
  }
}

module.exports = new PaymentController();
