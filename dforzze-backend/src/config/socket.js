const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('./environment');
const logger = require('../utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Autenticación opcional en el handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        // Token inválido — conexión anónima permitida para stock updates
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`🔌 Socket conectado: ${socket.id}`);

    // Suscribirse a actualizaciones de un producto específico
    socket.on('subscribe:product', (productId) => {
      socket.join(`product:${productId}`);
    });

    socket.on('unsubscribe:product', (productId) => {
      socket.leave(`product:${productId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`🔌 Socket desconectado: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.io inicializado');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
