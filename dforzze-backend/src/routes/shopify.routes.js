const express = require('express');
const router = express.Router();
const shopifyController = require('../controllers/ShopifyController');

/**
 * POST /api/shopify/webhook/orders-paid
 *
 * Shopify llama a este endpoint cuando una orden es pagada.
 * Requiere body raw (sin parsear) para verificar la firma HMAC.
 * El middleware express.raw() se aplica solo aquí.
 */
router.post(
  '/webhook/orders-paid',
  express.raw({ type: 'application/json' }),
  shopifyController.orderPaid.bind(shopifyController)
);

module.exports = router;
