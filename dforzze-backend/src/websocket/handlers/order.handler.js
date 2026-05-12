/**
 * Handler para eventos de pedidos en Socket.io
 * Permite al usuario suscribirse a confirmaciones de sus pedidos
 */
function registerOrderHandlers(socket) {
  // Si el usuario está autenticado, unirlo a su sala personal
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
  }
}

module.exports = { registerOrderHandlers };
