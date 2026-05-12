const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const validate = require('../middleware/validator');
const schemas = require('../utils/validators');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Listar productos con stock
 *     tags: [Products]
 */
router.get('/', validate(schemas.productFilters, 'query'), productController.list.bind(productController));

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener detalles de un producto
 *     tags: [Products]
 */
router.get('/:id', productController.getById.bind(productController));

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear producto (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, adminOnly, validate(schemas.createProduct), productController.create.bind(productController));

/**
 * @swagger
 * /api/products/{id}/stock:
 *   patch:
 *     summary: Actualizar stock de un producto (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/stock', auth, adminOnly, validate(schemas.updateStock), productController.updateStock.bind(productController));

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Eliminar producto (admin)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', auth, adminOnly, productController.delete.bind(productController));

module.exports = router;
