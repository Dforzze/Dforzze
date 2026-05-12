/**
 * Handler para eventos de stock en Socket.io
 * Gestiona suscripciones a rooms de productos específicos
 */
function registerStockHandlers(socket) {
  socket.on('subscribe:product', (productId) => {
    if (typeof productId === 'string' && productId.length > 0) {
      socket.join(`product:${productId}`);
    }
  });

  socket.on('unsubscribe:product', (productId) => {
    socket.leave(`product:${productId}`);
  });
}

module.exports = { registerStockHandlers };
