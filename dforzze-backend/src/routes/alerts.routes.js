const express = require('express');
const router = express.Router();
const alertController = require('../controllers/AlertController');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Todas las rutas requieren autenticación y ser admin
router.use(auth);
router.use(adminOnly);

// GET /api/alerts - Obtener alertas
router.get('/', alertController.getAlerts);

// GET /api/alerts/summary - Resumen de alertas
router.get('/summary', alertController.getSummary);

// PATCH /api/alerts/:id/acknowledge - Reconocer alerta
router.patch('/:id/acknowledge', alertController.acknowledge);

module.exports = router;
