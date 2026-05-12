# DFORZZE Backend

Backend API para el sistema de inventario DFORZZE con autenticación JWT, control de stock en tiempo real, y sistema de stickers.

## 🚀 Inicio Rápido

### 1. Requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 2. Instalación

```bash
cd dforzze-backend
npm install
```

### 3. Configuración

Copia `.env.example` a `.env` y configura tus variables:

```bash
cp .env.example .env
```

Variables necesarias:
```
DATABASE_URL=postgresql://usuario:password@localhost:5432/dforzze_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=tu-clave-secreta
JWT_REFRESH_SECRET=tu-clave-refresh-secreta
FRONTEND_URL=http://localhost:5500
```

### 4. Base de datos

```bash
# Crear la base de datos
createdb dforzze_db

# Ejecutar migraciones
npx prisma migrate dev

# Poblar con datos iniciales
npm run seed
```

### 5. Iniciar servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Refrescar token |
| POST | `/api/auth/logout` | Cerrar sesión |

### Productos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos (paginado) |
| GET | `/api/products/:id` | Obtener producto |
| POST | `/api/products` | Crear producto (admin) |
| PATCH | `/api/products/:id/stock` | Actualizar stock (admin) |
| DELETE | `/api/products/:id` | Eliminar producto (admin) |

### Pedidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders` | Listar mis pedidos |
| GET | `/api/orders/:id` | Obtener pedido |

### Inventario (admin)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory/movements` | Historial de movimientos |
| GET | `/api/inventory/alerts` | Alertas de stock |
| GET | `/api/inventory/export` | Exportar CSV |

### Stickers

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stickers/my-collection` | Mi colección |
| POST | `/api/stickers/redeem` | Canjear código |
| POST | `/api/stickers/generate-code` | Generar código (admin) |

## 🔌 WebSocket

El backend usa Socket.io para actualizaciones en tiempo real.

### Eventos

- `stock_update` - Emitido cuando cambia el stock de un producto
- `order_confirmed` - Emitido cuando se confirma un pedido

### Uso en frontend

```javascript
// Conectar
const socket = io('http://localhost:3000', {
  auth: { token: 'tu-jwt-token' }
});

// Escuchar actualizaciones de stock
socket.on('stock_update', (data) => {
  console.log('Stock actualizado:', data.productId);
});
```

## 📊 Sistema de Stickers

Los stickers se asignan automáticamente según el monto de compra:

| Monto | Stickers |
|-------|----------|
| S/. 100+ | 1 sticker |
| S/. 200+ | 2 stickers |
| S/. 400+ | 3 stickers |

### Rangos

| Rango | Stickers necesarios |
|-------|---------------------|
| NONE | 0-6 |
| INITIATED | 7-13 |
| BUILDER | 14-20 |
| INNER | 21+ |

## 🔒 Prevención de Overselling

El sistema usa `SELECT FOR UPDATE` en transacciones PostgreSQL para garantizar que no se venda más stock del disponible, incluso con múltiples compras simultáneas.

## 📦 Estructura del Proyecto

```
dforzze-backend/
├── prisma/
│   └── schema.prisma      # Esquema de base de datos
├── src/
│   ├── config/            # Configuraciones (DB, Redis, Socket)
│   ├── controllers/       # Controladores HTTP
│   ├── middleware/        # Middlewares (auth, validación, errores)
│   ├── routes/            # Definición de rutas
│   ├── services/          # Lógica de negocio
│   ├── utils/             # Utilidades (JWT, hash, logger)
│   └── websocket/         # Handlers de WebSocket
├── tests/                 # Tests
├── public/
│   └── js/api.js          # Cliente API para frontend
└── package.json
```

## 🧪 Tests

```bash
# Todos los tests
npm test

# Solo unit tests
npm run test:unit

# Solo integration tests
npm run test:integration
```

## 🛠️ Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar en producción |
| `npm run dev` | Iniciar con hot reload |
| `npm run seed` | Poblar base de datos |
| `npm test` | Ejecutar tests |

## 📝 Licencia

ISC
