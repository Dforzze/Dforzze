const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/InventoryController');
const validate = require('../middleware/validator');
const schemas = require('../utils/validators');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Todos los endpoints de inventario requieren autenticación de admin
router.use(auth, adminOnly);

/**
 * @swagger
 * /api/inventory/movements:
 *   get:
 *     summary: Historial de movimientos de inventario
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/movements', validate(schemas.movementFilters, 'query'), inventoryController.getMovements.bind(inventoryController));

/**
 * @swagger
 * /api/inventory/alerts:
 *   get:
 *     summary: Alertas de stock bajo
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/alerts', inventoryController.getAlerts.bind(inventoryController));

/**
 * @swagger
 * /api/inventory/alerts/{id}/acknowledge:
 *   patch:
 *     summary: Marcar alerta como reconocida
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/alerts/:id/acknowledge', inventoryController.acknowledgeAlert.bind(inventoryController));

/**
 * @swagger
 * /api/inventory/export:
 *   get:
 *     summary: Exportar historial de movimientos a CSV
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export', inventoryController.exportCSV.bind(inventoryController));

module.exports = router;
