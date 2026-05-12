# Plan de Implementación: Sistema de Inventario Backend — DFORZZE

## Descripción General

Implementación incremental del backend Node.js + Express + PostgreSQL + Redis + Socket.io para DFORZZE. Cada tarea construye sobre la anterior, comenzando por la infraestructura base hasta llegar a la integración completa con el frontend y el sistema de stickers existente.

## Tareas

- [x] 1. Inicializar proyecto Node.js y estructura de carpetas
  - Crear directorio `dforzze-backend/` con la estructura definida en el diseño (`src/config`, `src/middleware`, `src/models`, `src/services`, `src/controllers`, `src/routes`, `src/websocket`, `src/utils`, `prisma/`, `tests/`, `scripts/`)
  - Inicializar `package.json` con `npm init`
  - Instalar dependencias de producción: `express`, `@prisma/client`, `prisma`, `ioredis`, `socket.io`, `jsonwebtoken`, `bcrypt`, `joi`, `cors`, `helmet`, `express-rate-limit`, `morgan`, `winston`, `uuid`, `dotenv`
  - Instalar dependencias de desarrollo: `jest`, `supertest`, `nodemon`, `eslint`
  - Crear `.env.example` con todas las variables requeridas (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `NODE_ENV`)
  - Crear `src/config/environment.js` para cargar y validar variables de entorno
  - _Requisitos: 1.1, 1.4, 12.5_

- [x] 2. Configurar base de datos PostgreSQL con Prisma
  - [x] 2.1 Crear esquema Prisma completo
    - Escribir `prisma/schema.prisma` con todos los modelos: `User`, `Product`, `Order`, `OrderItem`, `InventoryMovement`, `Sticker`, `Coupon`, `Alert`, `RankRequest`
    - Definir enums: `Role`, `Rank`, `OrderStatus`, `MovementType`, `RequestStatus`
    - Configurar índices en campos de búsqueda frecuente (`email`, `stock`, `category`, `createdAt`, `acknowledged`)
    - _Requisitos: 1.1, 1.5, 5.6_

  - [x] 2.2 Crear migración inicial y seed de datos
    - Ejecutar `prisma migrate dev --name init` para generar la migración inicial
    - Crear `scripts/seed.js` con productos iniciales de DFORZZE (SHORT 01, TEE SAKURA, etc.) con stock y precios reales
    - Crear usuario administrador inicial en el seed
    - _Requisitos: 1.1, 4.5_

  - [x] 2.3 Configurar conexión a base de datos
    - Escribir `src/config/database.js` con instancia de `PrismaClient` y manejo de conexión/desconexión
    - Implementar manejo de errores de conexión con logging
    - _Requisitos: 1.1, 11.5_

  - [ ]* 2.4 Escribir tests de integración para modelos de datos
    - Verificar que las constraints de integridad referencial funcionan correctamente
    - Verificar que los índices están presentes
    - _Requisitos: 1.5_

- [x] 3. Configurar Redis y capa de caché
  - Escribir `src/config/redis.js` con cliente `ioredis` y manejo de reconexión automática
  - Implementar `src/services/CacheService.js` con métodos: `get`, `set`, `del`, `setex`, `invalidatePattern`
  - Configurar TTL por defecto de 60 segundos para stock y 5 minutos para listado de productos
  - _Requisitos: 13.4, 13.5_

- [x] 4. Implementar utilidades base y middleware global
  - [x] 4.1 Crear utilidades de JWT y hash
    - Escribir `src/utils/jwt.js` con funciones `generateToken`, `generateRefreshToken`, `verifyToken`, `verifyRefreshToken`
    - Escribir `src/utils/hash.js` con funciones `hashPassword` y `comparePassword` usando bcrypt (mínimo 10 rounds)
    - _Requisitos: 1.6, 1.7, 12.6, 12.7_

  - [x] 4.2 Crear middleware de autenticación y autorización
    - Escribir `src/middleware/auth.js` para validar JWT en headers `Authorization: Bearer {token}`
    - Escribir `src/middleware/adminOnly.js` para verificar rol `ADMIN`
    - _Requisitos: 12.1, 12.2_

  - [x] 4.3 Crear middleware de validación y rate limiting
    - Escribir `src/utils/validators.js` con schemas Joi para todos los endpoints (auth, productos, pedidos, inventario)
    - Escribir `src/middleware/validator.js` para aplicar schemas Joi a `req.body`, `req.params` y `req.query`
    - Escribir `src/middleware/rateLimiter.js` con límite de 100 req/min por IP usando `express-rate-limit`
    - _Requisitos: 12.3, 12.4_

  - [x] 4.4 Crear middleware de manejo de errores y logger
    - Escribir `src/utils/logger.js` con Winston configurado para logs estructurados (JSON en producción, pretty en desarrollo)
    - Escribir `src/middleware/errorHandler.js` con clases `AppError`, `StockError`, `ValidationError`, `AuthError`, `ForbiddenError` y middleware global de errores
    - _Requisitos: 11.5, 11.6_

  - [ ]* 4.5 Escribir unit tests para utilidades JWT y hash
    - Verificar generación y verificación de tokens
    - Verificar que bcrypt hashea y compara correctamente
    - Verificar expiración de tokens
    - _Requisitos: 1.6, 1.7, 12.6, 12.7_

- [x] 5. Implementar autenticación JWT
  - [x] 5.1 Implementar AuthService
    - Escribir `src/services/AuthService.js` con métodos: `register`, `login`, `refreshToken`, `logout`, `revokeToken`
    - Implementar almacenamiento de refresh tokens en Redis con TTL configurable
    - Implementar revocación de tokens mediante lista negra en Redis
    - _Requisitos: 1.2, 1.6, 1.7, 12.7, 12.8_

  - [x] 5.2 Implementar AuthController y rutas de autenticación
    - Escribir `src/controllers/AuthController.js` con handlers para `register`, `login`, `refresh`, `logout`
    - Escribir `src/routes/auth.routes.js` con endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
    - Aplicar validación Joi a todos los endpoints de auth
    - _Requisitos: 1.2, 1.4, 9.7_

  - [ ]* 5.3 Escribir tests de integración para autenticación
    - Verificar registro con email duplicado retorna 409
    - Verificar login con credenciales inválidas retorna 401
    - Verificar que el refresh token renueva el access token
    - Verificar que logout revoca el token
    - _Requisitos: 1.2, 1.6, 12.7, 12.8_

- [ ] 6. Checkpoint — Verificar infraestructura base
  - Asegurarse de que todos los tests pasan, el servidor arranca correctamente, la conexión a PostgreSQL y Redis funciona, y los endpoints de auth responden. Consultar al usuario si hay dudas.

- [x] 7. Implementar CRUD de productos
  - [x] 7.1 Implementar ProductService
    - Escribir `src/services/ProductService.js` con métodos: `listProducts` (con paginación y filtros), `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`
    - Integrar `CacheService` para cachear listado de productos y stock individual
    - _Requisitos: 2.2, 2.3, 4.2, 4.5, 4.6, 9.1, 9.2, 13.4_

  - [x] 7.2 Implementar ProductController y rutas de productos
    - Escribir `src/controllers/ProductController.js` con handlers para todos los endpoints de productos
    - Escribir `src/routes/products.routes.js` con endpoints: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id/stock`, `DELETE /api/products/:id`
    - Proteger `POST`, `PATCH` y `DELETE` con middleware `auth` + `adminOnly`
    - Aplicar paginación (máximo 100 items por página) en `GET /api/products`
    - _Requisitos: 1.4, 4.3, 4.5, 4.6, 9.1, 9.2, 9.3, 9.6, 9.7, 13.6_

  - [ ]* 7.3 Escribir unit tests para ProductService
    - Verificar que el listado aplica filtros correctamente
    - Verificar que la paginación funciona
    - Verificar que el caché se invalida al actualizar stock
    - _Requisitos: 9.1, 9.2, 13.4, 13.5_

- [x] 8. Implementar sistema de inventario con prevención de overselling
  - [x] 8.1 Implementar InventoryService con SELECT FOR UPDATE
    - Escribir `src/services/InventoryService.js` completo según el diseño
    - Implementar `validateAndReserveStock` con transacción Prisma, `SELECT FOR UPDATE`, ordenamiento de items por `productId` para prevenir deadlocks, y rollback automático en caso de stock insuficiente
    - Implementar `updateStock` para ajustes manuales de admin con registro de movimiento
    - Implementar `getStock` con cache Redis (TTL 60s)
    - Implementar `invalidateStockCache` que invalida Redis y dispara broadcast WebSocket
    - Implementar `createLowStockAlert` para generar alertas cuando stock cae bajo el umbral
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 7.1, 7.4, 9.3_

  - [x] 8.2 Implementar InventoryController y rutas de inventario
    - Escribir `src/controllers/InventoryController.js` con handlers para movimientos, alertas y exportación
    - Escribir `src/routes/inventory.routes.js` con endpoints: `GET /api/inventory/movements`, `GET /api/inventory/alerts`, `PATCH /api/inventory/alerts/:id/acknowledge`, `GET /api/inventory/export`
    - Implementar exportación CSV en `GET /api/inventory/export` con headers `Content-Disposition: attachment`
    - Proteger todos los endpoints con `auth` + `adminOnly`
    - _Requisitos: 4.1, 4.7, 4.8, 6.2, 6.5, 7.3, 7.4, 7.5, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 8.3 Escribir tests de integración para prevención de overselling
    - Simular 10 compras concurrentes del mismo producto con stock = 5 y verificar que exactamente 5 pedidos se confirman y 5 son rechazados
    - Verificar que `stock_remaining >= 0` después de cualquier combinación de pedidos
    - Verificar que el rollback funciona cuando el stock es insuficiente para algún item del pedido
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 9. Implementar sistema de pedidos con validación atómica
  - [x] 9.1 Implementar OrderService
    - Escribir `src/services/OrderService.js` completo según el diseño
    - Implementar `createOrder` con: cálculo de totales, validación de cupón, cálculo de envío, creación de pedido + reserva de stock en transacción única, asignación de stickers post-confirmación
    - Implementar `calculateStickers` con regla: S/. 100+ = 1, S/. 200+ = 2, S/. 400+ = 3
    - Implementar `getOrders` con filtros por status y paginación
    - _Requisitos: 1.3, 3.5, 3.7, 5.2, 5.3, 10.1, 10.3, 10.7_

  - [x] 9.2 Implementar OrderController y rutas de pedidos
    - Escribir `src/controllers/OrderController.js` con handlers para crear y listar pedidos
    - Escribir `src/routes/orders.routes.js` con endpoints: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`
    - Retornar 409 con detalle de items sin stock cuando el pedido falla por stock insuficiente
    - Proteger todos los endpoints con middleware `auth`
    - _Requisitos: 1.3, 1.4, 3.7, 9.6, 9.7_

  - [ ]* 9.3 Escribir unit tests para OrderService
    - Verificar cálculo correcto de stickers para distintos montos (99, 100, 199, 200, 399, 400)
    - Verificar cálculo de totales con descuento y envío
    - Verificar que pedido con cupón inválido retorna error
    - _Requisitos: 10.7_

- [ ] 10. Checkpoint — Verificar flujo completo de compra
  - Asegurarse de que todos los tests pasan, incluyendo el test de concurrencia de overselling. Consultar al usuario si hay dudas.

- [ ] 11. Implementar WebSockets para sincronización en tiempo real
  - [x] 11.1 Configurar Socket.io y eventos de stock
    - Escribir `src/config/socket.js` para inicializar Socket.io con el servidor Express, configurar autenticación por token en el handshake
    - Escribir `src/websocket/events.js` con función `broadcastStockUpdate(productId, newStock)` que emite evento `stock_update` a todos los clientes conectados
    - Escribir `src/websocket/handlers/stock.handler.js` para manejar suscripciones a rooms de productos específicos
    - Escribir `src/websocket/handlers/order.handler.js` para emitir confirmaciones de pedido al usuario correspondiente
    - _Requisitos: 2.1, 2.5, 2.7, 3.6_

  - [x] 11.2 Crear API Client Layer en el frontend
    - Crear `public/js/api.js` con la clase `DforzzeAPI` según el diseño: métodos de auth, productos, pedidos, inventario, stickers y WebSocket
    - Implementar interceptor de refresh token automático en `handleResponse`
    - Implementar `connectWebSocket` que escucha `stock_update` y dispara `CustomEvent('dforzze:stock_update')`
    - Implementar retry con backoff exponencial (hasta 3 intentos) para peticiones fallidas
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.3_

  - [ ]* 11.3 Escribir tests de integración para WebSockets
    - Verificar que al actualizar stock vía `PATCH /api/products/:id/stock` se emite evento `stock_update` a los clientes conectados en menos de 3 segundos
    - _Requisitos: 2.1, 2.5_

- [-] 12. Implementar panel de administración de inventario
  - [x] 12.1 Implementar AlertService
    - Escribir `src/services/AlertService.js` con métodos: `getAlerts`, `acknowledgeAlert`, `createLowStockAlert`, `clearAlertsForProduct`
    - Implementar lógica para limpiar alertas cuando el stock de un producto agotado recibe restock
    - _Requisitos: 6.1, 6.2, 6.3, 6.6, 6.7_

  - [x] 12.2 Integrar panel admin en admin.html
    - Modificar `admin.html` para agregar sección "Inventario" que consume `GET /api/products` y `GET /api/inventory/alerts` vía `dforzzeAPI`
    - Implementar tabla de productos con stock actual, badge de estado (disponible/bajo/agotado) y botón de edición de stock
    - Implementar formulario de actualización de stock que llama `PATCH /api/products/:id/stock` con motivo
    - Implementar contador de alertas de stock bajo en el dashboard
    - Implementar filtro de productos por estado de stock
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 6.2, 6.5, 6.6_

  - [ ]* 12.3 Escribir unit tests para AlertService
    - Verificar que se crea alerta cuando stock cae por debajo del umbral
    - Verificar que la alerta se limpia cuando el producto recibe restock
    - _Requisitos: 6.1, 6.7_

- [ ] 13. Implementar historial de movimientos de inventario
  - Implementar `GET /api/inventory/movements` con filtros por `productId`, `type`, `startDate`, `endDate` y paginación en `InventoryController`
  - Implementar exportación a CSV en `GET /api/inventory/export` usando generación manual de CSV (sin dependencias extra)
  - Integrar vista de historial de movimientos en `admin.html` con tabla cronológica y filtros
  - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 14. Implementar integración con sistema de stickers
  - [x] 14.1 Implementar StickerService
    - Escribir `src/services/StickerService.js` con métodos: `assignStickers` (asigna stickers post-compra), `getUserStickers`, `redeemCode`, `generateCode`, `syncFromLocalStorage`
    - Implementar `syncFromLocalStorage` para migrar stickers históricos de usuarios durante el login
    - Implementar cálculo de rank basado en `stickerCount`: NONE (0-6), INITIATED (7-13), BUILDER (14-20), INNER (21+)
    - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 14.2 Implementar StickerController y rutas de stickers
    - Escribir `src/controllers/StickerController.js` con handlers para colección, canje y generación de códigos
    - Escribir `src/routes/stickers.routes.js` con endpoints: `GET /api/stickers/my-collection`, `POST /api/stickers/redeem`, `POST /api/stickers/generate-code`
    - Proteger `POST /api/stickers/generate-code` con `auth` + `adminOnly`
    - _Requisitos: 10.4, 9.6, 9.7_

  - [ ]* 14.3 Escribir unit tests para StickerService
    - Verificar asignación correcta de stickers según monto (S/. 99 = 0, S/. 100 = 1, S/. 200 = 2, S/. 400 = 3)
    - Verificar cálculo de rank según conteo de stickers
    - Verificar que `syncFromLocalStorage` no duplica stickers existentes
    - _Requisitos: 10.7_

- [x] 15. Integrar rutas en app.js y conectar todos los componentes
  - Escribir `src/routes/index.js` que agrega todas las rutas bajo el prefijo `/api`
  - Escribir `src/app.js` con configuración completa de Express: `helmet`, `cors`, `morgan`, `express.json`, rate limiter global, rutas, middleware de errores
  - Inicializar Socket.io junto con el servidor HTTP en `src/app.js`
  - Verificar que todos los endpoints responden con el formato JSON estándar `{ success, data }` o `{ success, error }`
  - _Requisitos: 1.4, 9.6, 9.7, 12.3, 12.5_

- [ ] 16. Checkpoint — Verificar integración completa del backend
  - Asegurarse de que todos los tests pasan y el servidor completo funciona end-to-end. Consultar al usuario si hay dudas.

- [ ] 17. Integrar frontend con el backend
  - [x] 17.1 Integrar checkout.html con la API
    - Modificar la función `placeOrder()` en `checkout.html` para llamar `dforzzeAPI.createOrder()` en lugar de guardar en localStorage
    - Implementar `showOrderConfirmation()` con datos del pedido y stickers ganados
    - Manejar error 409 (stock insuficiente) mostrando qué items tienen problema
    - _Requisitos: 3.4, 3.5, 3.7, 10.1, 11.1, 11.6_

  - [ ] 17.2 Integrar catálogo y página de producto con stock en tiempo real
    - Modificar `catalogo.html` para cargar productos desde `GET /api/products` y mostrar badges de stock
    - Modificar `producto.html` para cargar stock desde `GET /api/products/:id` y deshabilitar botones cuando stock = 0
    - Conectar WebSocket en ambas páginas para escuchar `dforzze:stock_update` y actualizar UI sin recargar
    - Implementar validación de stock en carrito antes de proceder al checkout
    - _Requisitos: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.6, 8.5_

  - [ ] 17.3 Integrar sistema de autenticación en el frontend
    - Modificar `dforzze.html` para usar `dforzzeAPI.login()` y `dforzzeAPI.register()` en lugar de localStorage
    - Implementar sincronización de stickers desde localStorage al backend durante el login (`syncFromLocalStorage`)
    - Limpiar datos locales sensibles al hacer logout
    - _Requisitos: 8.1, 8.6, 8.7, 10.6_

- [ ] 18. Escribir script de migración desde localStorage
  - Crear `scripts/migrate-localstorage.js` que:
    - Lee datos de usuarios, pedidos y stickers desde un archivo JSON exportado del localStorage
    - Inserta usuarios con contraseñas hasheadas (fuerza reset de contraseña en primer login)
    - Migra pedidos históricos con sus items
    - Migra stickers históricos asociados a usuarios
    - Calcula y actualiza `stickerCount` y `rank` de cada usuario
    - Genera reporte de migración con conteos y errores
  - _Requisitos: 1.1, 10.5, 10.6_

- [ ] 19. Configurar Swagger/OpenAPI para documentación de la API
  - Instalar `swagger-jsdoc` y `swagger-ui-express`
  - Agregar comentarios JSDoc con anotaciones OpenAPI en todos los archivos de rutas
  - Configurar endpoint `GET /api/docs` que sirve la UI de Swagger
  - Documentar todos los endpoints con request body, query params, responses y ejemplos
  - _Requisitos: 9.8_

- [ ] 20. Configurar backups automáticos
  - Crear `scripts/backup.js` que ejecuta `pg_dump` y comprime el resultado con timestamp
  - Configurar cron job (o instrucciones para configurarlo) para backup diario automático
  - Documentar en `README.md` el procedimiento de restauración desde backup (`pg_restore`)
  - Documentar política de retención de 30 días y procedimiento de validación de integridad semanal
  - _Requisitos: 14.1, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 21. Checkpoint final — Verificar sistema completo
  - Asegurarse de que todos los tests pasan, el flujo completo de compra funciona end-to-end, los WebSockets sincronizan en tiempo real, y el panel de administración gestiona el inventario correctamente. Consultar al usuario si hay dudas.

## Notas

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad completa
- Los checkpoints garantizan validación incremental antes de continuar
- El stack es Node.js + Express + PostgreSQL (Prisma ORM) + Redis + Socket.io, tal como define el diseño
- La prevención de overselling se garantiza mediante `SELECT FOR UPDATE` dentro de transacciones Prisma
- No se incluyen property-based tests porque el diseño no define una sección de Correctness Properties
