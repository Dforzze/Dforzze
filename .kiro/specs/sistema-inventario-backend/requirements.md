# Requirements Document

## Introduction

El Sistema de Inventario en Tiempo Real con Backend para DFORZZE transforma la arquitectura actual basada en localStorage a una solución robusta con base de datos centralizada. El sistema previene overselling, sincroniza inventario entre múltiples clientes en tiempo real, y proporciona una experiencia de compra confiable para los drops limitados de streetwear.

## Glossary

- **Sistema_Inventario**: El sistema completo de gestión de stock, pedidos y sincronización en tiempo real
- **Backend_API**: Servidor centralizado que gestiona la lógica de negocio y la base de datos
- **Base_Datos**: Almacenamiento persistente para productos, usuarios, pedidos e inventario
- **Producto**: Item del catálogo de DFORZZE con stock, precio y metadata
- **Stock**: Cantidad disponible de un producto para venta
- **Usuario**: Cliente registrado en DFORZZE que puede realizar compras
- **Administrador**: Usuario con permisos para gestionar inventario y productos
- **Pedido**: Orden de compra realizada por un usuario
- **Movimiento_Inventario**: Registro de cualquier cambio en el stock de un producto
- **Alerta_Stock**: Notificación generada cuando el stock alcanza un umbral crítico
- **Sincronizacion_Real_Time**: Mecanismo que mantiene el frontend actualizado con el estado del backend
- **Bloqueo_Compra**: Restricción que impide comprar productos sin stock disponible
- **Prevencion_Overselling**: Lógica que evita vender más unidades de las disponibles

## Requirements

### Requirement 1: Migración a Backend con Base de Datos

**User Story:** Como administrador de DFORZZE, quiero que los datos de productos, usuarios y pedidos se almacenen en una base de datos centralizada, para que la información esté persistida y sea accesible desde cualquier punto del sistema.

#### Acceptance Criteria

1. THE Backend_API SHALL persistir productos, usuarios y pedidos en una Base_Datos
2. WHEN un usuario se registra, THE Backend_API SHALL almacenar sus datos en la Base_Datos
3. WHEN se crea un pedido, THE Backend_API SHALL almacenarlo en la Base_Datos con todos sus detalles
4. THE Backend_API SHALL proporcionar endpoints RESTful para todas las operaciones CRUD
5. THE Base_Datos SHALL mantener integridad referencial entre productos, pedidos y usuarios
6. THE Backend_API SHALL autenticar usuarios mediante tokens JWT
7. THE Backend_API SHALL Hashear contraseñas con algoritmo bcrypt antes de almacenarlas

### Requirement 2: Control de Stock en Tiempo Real

**User Story:** Como cliente de DFORZZE, quiero ver el stock actualizado de los productos en tiempo real, para saber si hay disponibilidad antes de intentar comprar.

#### Acceptance Criteria

1. WHEN el stock de un producto cambia, THE Sistema_Inventario SHALL actualizar la vista del frontend en menos de 3 segundos
2. THE Sistema_Inventario SHALL mostrar el stock disponible de cada producto en la página de producto
3. THE Sistema_Inventario SHALL mostrar el stock disponible en el catálogo general
4. WHEN el stock llega a cero, THE Sistema_Inventario SHALL mostrar el producto como "Agotado"
5. THE Sistema_Inventario SHALL implementar WebSockets para comunicación en tiempo real
6. THE Backend_API SHALL validar stock disponible antes de procesar cualquier compra
7. WHEN múltiples clientes intentan comprar el mismo producto simultáneamente, THE Sistema_Inventario SHALL procesar las transacciones de forma serializada para evitar overselling

### Requirement 3: Bloqueo de Compras sin Stock

**User Story:** Como cliente de DFORZZE, quiero que se me impida intentar comprar un producto agotado, para no tener una experiencia frustrante de compra fallida.

#### Acceptance Criteria

1. WHEN un producto tiene stock igual a cero, THE Sistema_Inventario SHALL deshabilitar el botón de compra en la página de producto
2. WHEN un producto tiene stock igual a cero, THE Sistema_Inventario SHALL deshabilitar el botón de agregar al carrito
3. WHEN un usuario intenta agregar más unidades que el stock disponible, THE Sistema_Inventario SHALL mostrar un mensaje de error indicando el stock máximo disponible
4. THE Sistema_Inventario SHALL validar stock en el carrito antes de proceder al checkout
5. THE Sistema_Inventario SHALL validar stock nuevamente antes de confirmar el pedido
6. IF el stock cambia mientras un usuario tiene productos en el carrito, THE Sistema_Inventario SHALL notificar al usuario sobre la nueva disponibilidad
7. THE Backend_API SHALL rechazar pedidos que excedan el stock disponible con un mensaje de error claro

### Requirement 4: Panel de Administración de Inventario

**User Story:** Como administrador de DFORZZE, quiero un panel para gestionar el inventario de productos, para mantener el stock actualizado sin necesidad de modificar código.

#### Acceptance Criteria

1. THE Sistema_Inventario SHALL mostrar una sección de "Inventario" en el panel de administración
2. THE Sistema_Inventario SHALL listar todos los productos con su stock actual en el panel de inventario
3. THE Sistema_Inventario SHALL permitir al Administrador editar el stock de cada producto
4. WHEN el Administrador actualiza el stock de un producto, THE Sistema_Inventario SHALL registrar un Movimiento_Inventario con fecha, cantidad anterior, cantidad nueva y motivo
5. THE Sistema_Inventario SHALL permitir al Administrador agregar nuevos productos con stock inicial
6. THE Sistema_Inventario SHALL permitir al Administrador eliminar productos del inventario
7. THE Sistema_Inventario SHALL mostrar el historial de movimientos de inventario por producto
8. THE Sistema_Inventario SHALL permitir filtrar productos por estado de stock (disponible, bajo, agotado)

### Requirement 5: Prevención de Overselling

**User Story:** Como administrador de DFORZZE, quiero estar seguro de que nunca se venderán más unidades de las disponibles, para mantener la confianza de los clientes y evitar problemas logísticos.

#### Acceptance Criteria

1. THE Backend_API SHALL implementar bloqueos de fila (row-level locking) al decrementar stock
2. WHEN se procesa un pedido, THE Backend_API SHALL verificar stock disponible dentro de una transacción de base de datos
3. IF el stock es insuficiente durante el procesamiento de un pedido, THE Backend_API SHALL revertir la transacción completa
4. THE Backend_API SHALL rechazar pedidos concurrentes que excedan el stock disponible
5. THE Sistema_Inventario SHALL manejar condicion de carrera (race conditions) correctamente
6. FOR ALL pedidos confirmados, THE Sistema_Inventario SHALL garantizar que stock_remaining >= 0
7. THE Backend_API SHALL registrar intentos de compra fallidos por falta de stock para análisis

### Requirement 6: Alertas de Stock Bajo

**User Story:** Como administrador de DFORZZE, quiero recibir alertas cuando el stock de un producto esté bajo, para poder reabastecer o decidir si es momento de un nuevo drop.

#### Acceptance Criteria

1. WHEN el stock de un producto cae por debajo de un umbral configurable, THE Sistema_Inventario SHALL generar una Alerta_Stock
2. THE Sistema_Inventario SHALL mostrar alertas de stock bajo en el dashboard de administración
3. THE Sistema_Inventario SHALL permitir configurar el umbral de stock bajo por producto o globalmente
4. THE Sistema_Inventario SHALL permitir configurar alertas por email para stock bajo
5. THE Sistema_Inventario SHALL distinguir visualmente productos con stock bajo en el panel de inventario
6. THE Sistema_Inventario SHALL mostrar un contador de productos con stock bajo en el dashboard
7. WHEN un producto agotado recibe nuevo stock, THE Sistema_Inventario SHALL limpiar su estado de alerta

### Requirement 7: Historial de Movimientos de Inventario

**User Story:** Como administrador de DFORZZE, quiero ver un historial completo de todos los cambios de inventario, para auditar el stock y entender patrones de venta.

#### Acceptance Criteria

1. THE Sistema_Inventario SHALL registrar un Movimiento_Inventario por cada cambio de stock
2. FOR EACH Movimiento_Inventario, THE Sistema_Inventario SHALL almacenar: fecha y hora, producto afectado, cantidad anterior, cantidad nueva, tipo de movimiento (compra, ajuste, devolución), usuario o sistema responsable
3. THE Sistema_Inventario SHALL mostrar una lista cronológica de movimientos en el panel de administración
4. THE Sistema_Inventario SHALL permitir filtrar movimientos por producto, fecha y tipo
5. THE Sistema_Inventario SHALL permitir exportar el historial de movimientos a CSV
6. WHEN un pedido reduce el stock, THE Sistema_Inventario SHALL registrar el ID del pedido en el Movimiento_Inventario
7. THE Sistema_Inventario SHALL calcular y mostrar el stock total actual basándose en el historial de movimientos

### Requirement 8: Sincronización Frontend-Backend

**User Story:** Como cliente de DFORZZE, quiero que mi sesión y carrito se mantengan sincronizados aunque cambie de dispositivo o navegador, para tener una experiencia de compra consistente.

#### Acceptance Criteria

1. WHEN un usuario inicia sesión en un nuevo dispositivo, THE Sistema_Inventario SHALL cargar su carrito desde el Backend_API
2. WHEN un usuario agrega productos al carrito, THE Sistema_Inventario SHALL sincronizar el carrito con el Backend_API
3. THE Sistema_Inventario SHALL mantener el carrito sincronizado entre múltiples pestañas del mismo navegador
4. WHEN la conexión se pierde temporalmente, THE Sistema_Inventario SHALL reintentar la sincronización automáticamente
5. THE Sistema_Inventario SHALL mostrar un indicador visual cuando el frontend está sincronizado con el backend
6. THE Sistema_Inventario SHALL manejar conflictos de sincronización usando la versión más reciente del Backend_API como fuente de verdad
7. WHEN un usuario cierra sesión, THE Sistema_Inventario SHALL limpiar los datos locales sensibles

### Requirement 9: API RESTful para Productos e Inventario

**User Story:** Como desarrollador, quiero una API bien documentada para productos e inventario, para poder integrar futuras funcionalidades o aplicaciones móviles.

#### Acceptance Criteria

1. THE Backend_API SHALL exponer endpoint GET /api/products para listar productos con stock
2. THE Backend_API SHALL exponer endpoint GET /api/products/:id para obtener detalles de un producto incluyendo stock
3. THE Backend_API SHALL exponer endpoint PATCH /api/products/:id/stock para actualizar stock (solo administradores)
4. THE Backend_API SHALL exponer endpoint GET /api/inventory/movements para obtener historial de movimientos
5. THE Backend_API SHALL exponer endpoint GET /api/inventory/alerts para obtener alertas de stock bajo
6. ALL endpoints SHALL retornar respuestas en formato JSON
7. ALL endpoints SHALL retornar códigos de estado HTTP apropiados (200, 201, 400, 401, 403, 404, 500)
8. THE Backend_API SHALL documentar todos los endpoints usando OpenAPI/Swagger

### Requirement 10: Integración con Sistema de Stickers Existente

**User Story:** Como cliente de DFORZZE, quiero que el nuevo sistema de inventario funcione correctamente con el sistema de stickers y membresía actual, para seguir ganando stickers con mis compras.

#### Acceptance Criteria

1. WHEN un pedido se confirma exitosamente, THE Sistema_Inventario SHALL integrarse con el Sistema_Stickers existente para asignar stickers según el monto de compra
2. THE Backend_API SHALL mantener compatibilidad con la lógica de stickers basada en localStorage durante la transición
3. WHEN un usuario completa una compra, THE Sistema_Inventario SHALL garantizar que los stickers se asignen al usuario correcto en la Base_Datos
4. THE Backend_API SHALL exponer endpoints para consultar el estado de stickers de un usuario desde la Base_Datos
5. WHEN la migración a backend esté completa, THE Sistema_Inventario SHALL mantener todos los stickers históricos de los usuarios
6. THE Sistema_Inventario SHALL sincronizar los datos de stickers entre localStorage y la Base_Datos durante el proceso de login
7. THE Sistema_Inventario SHALL validar que la asignación de stickers siga las reglas del Sistema_Stickers (S/. 100+ = 1, S/. 200+ = 2, S/. 400+ = 3)

### Requirement 11: Manejo de Errores y Recuperación

**User Story:** Como cliente de DFORZZE, quiero que el sistema maneje errores de gracefully y no pierda mi carrito si hay problemas de conexión, para tener una experiencia de compra confiable.

#### Acceptance Criteria

1. WHEN el Backend_API no está disponible, THE Sistema_Inventario SHALL mostrar un mensaje claro al usuario indicando que intente más tarde
2. THE Sistema_Inventario SHALL guardar una copia local del carrito en localStorage como respaldo
3. WHEN una petición al Backend_API falla por timeout, THE Sistema_Inventario SHALL reintentar hasta 3 veces con backoff exponencial
4. WHEN una compra falla después del pago, THE Sistema_Inventario SHALL iniciar un proceso de reembolso automático
5. THE Sistema_Inventario SHALL registrar todos los errores en un log centralizado para análisis
6. THE Sistema_Inventario SHALL mostrar mensajes de error específicos y accionables al usuario
7. WHEN se recupera de un error, THE Sistema_Inventario SHALL sincronizar cualquier dato pendiente

### Requirement 12: Seguridad y Autenticación

**User Story:** Como administrador de DFORZZE, quiero que el sistema tenga autenticación segura, para proteger los datos de clientes y prevenir accesos no autorizados.

#### Acceptance Criteria

1. THE Backend_API SHALL requerir autenticación JWT para todos los endpoints que modifiquen datos
2. THE Backend_API SHALL validar que solo administradores puedan acceder a endpoints de gestión de inventario
3. THE Backend_API SHALL implementar rate limiting para prevenir abuso de la API
4. THE Backend_API SHALL validar y sanitizar todos los inputs del usuario
5. THE Backend_API SHALL usar HTTPS para todas las comunicaciones
6. THE Backend_API SHALL hashear contraseñas usando bcrypt con un costo mínimo de 10 rounds
7. THE Backend_API SHALL expirar tokens JWT después de un período configurable (máximo 7 días)
8. THE Backend_API SHALL permitir revocar tokens JWT en caso de compromiso de seguridad

### Requirement 13: Performance y Escalabilidad

**User Story:** Como administrador de DFORZZE, quiero que el sistema maneje picos de tráfico durante drops limitados, para que todos los clientes tengan una experiencia de compra fluida.

#### Acceptance Criteria

1. THE Backend_API SHALL responder a peticiones de listado de productos en menos de 200ms bajo carga normal
2. THE Backend_API SHALL responder a peticiones de listado de productos en menos de 500ms bajo carga de 100 usuarios concurrentes
3. THE Sistema_Inventario SHALL soportar al menos 50 compras concurrentes sin errores
4. THE Backend_API SHALL implementar caching para productos y stock usando Redis o similar
5. THE Backend_API SHALL invalidar cache cuando el stock cambie
6. THE Backend_API SHALL paginar resultados de listados largos (más de 50 items)
7. THE Sistema_Inventario SHALL degradar gracefully bajo carga extrema, priorizando funcionalidades críticas

### Requirement 14: Backup y Recuperación de Datos

**User Story:** Como administrador de DFORZZE, quiero que los datos del sistema tengan respaldos automáticos, para poder recuperar información en caso de fallo del sistema.

#### Acceptance Criteria

1. THE Base_Datos SHALL configurar backups automáticos diarios
2. THE Sistema_Inventario SHALL almacenar backups en ubicación geográficamente separada del servidor principal
3. THE Sistema_Inventario SHALL poder restaurar datos desde un backup en menos de 1 hora
4. THE Sistema_Inventario SHALL retener backups por al menos 30 días
5. THE Sistema_Inventario SHALL validar integridad de backups semanalmente
6. THE Sistema_Inventario SHALL documentar procedimientos de recuperación ante desastres
7. WHEN se restaura un backup, THE Sistema_Inventario SHALL mantener consistencia entre productos, pedidos y movimientos de inventario
