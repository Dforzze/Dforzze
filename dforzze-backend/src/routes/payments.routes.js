const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/PaymentController');
const auth = require('../middleware/auth');

// Crear preferencia de pago (requiere auth)
router.post('/create-preference', auth, paymentController.createPreference.bind(paymentController));

// Webhook de Mercado Pago (NO requiere auth — viene de MP)
router.post('/webhook', paymentController.webhook.bind(paymentController));

// Páginas de retorno (redireccionan al frontend)
router.get('/success', paymentController.success.bind(paymentController));
router.get('/failure', paymentController.failure.bind(paymentController));
router.get('/pending', paymentController.pending.bind(paymentController));

module.exports = router;
