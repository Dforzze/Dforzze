require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

const config = require('./config/environment');
const { prisma } = require('./config/database');
const redisClient = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const stickersRoutes = require('./routes/stickers.routes');
const alertsRoutes = require('./routes/alerts.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();
const httpServer = createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Inyectar broadcast en InventoryService
const inventoryService = require('./services/InventoryService');
inventoryService.setBroadcast((productId) => {
  io.emit('stock_update', { productId, timestamp: new Date().toISOString() });
});

// Middlewares de seguridad
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/stickers', stickersRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/payments', paymentsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Error handler
app.use(errorHandler);

// WebSocket handlers
io.on('connection', (socket) => {
  socket.on('subscribe:product', (productId) => socket.join(`product:${productId}`));
  socket.on('unsubscribe:product', (productId) => socket.leave(`product:${productId}`));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  redisClient.quit();
  httpServer.close(() => process.exit(0));
});

// Iniciar servidor
const PORT = config.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 DFORZZE Backend corriendo en puerto ${PORT}`);
});

module.exports = { app, httpServer, io };
