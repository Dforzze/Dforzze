const express = require('express');
const router = express.Router();
const stickerController = require('../controllers/StickerController');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// Todas las rutas requieren autenticación
router.use(auth);

// GET /api/stickers/my-collection - Mi colección de stickers
router.get('/my-collection', stickerController.getMyCollection);

// POST /api/stickers/redeem - Canjear código de sticker
router.post('/redeem', stickerController.redeemCode);

// POST /api/stickers/sync - Sincronizar desde localStorage
router.post('/sync', stickerController.syncStickers);

// POST /api/stickers/generate-code - Generar código (solo admin)
router.post('/generate-code', adminOnly, stickerController.generateCode);

module.exports = router;
