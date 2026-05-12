const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const validate = require('../middleware/validator');
const schemas = require('../utils/validators');
const auth = require('../middleware/auth');

// Todos los endpoints de pedidos requieren autenticación
router.use(auth);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear nuevo pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Pedido creado }
 *       409: { description: Stock insuficiente }
 */
router.post('/', validate(schemas.createOrder), orderController.create.bind(orderController));

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Listar pedidos
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', orderController.list.bind(orderController));

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener detalles de un pedido
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', orderController.getById.bind(orderController));

module.exports = router;
