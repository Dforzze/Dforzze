/**
 * DFORZZE API Client
 * Capa de comunicación entre el frontend y el backend
 * Incluye: autenticación JWT, retry con backoff, WebSocket para stock en tiempo real
 */

const DforzzeAPI = (() => {
  const BASE_URL = window.DFORZZE_API_URL || 'https://dforzze-backend.onrender.com/api';
  let _token = localStorage.getItem('dforzze_token') || null;
  let _refreshToken = localStorage.getItem('dforzze_refresh_token') || null;
  let _socket = null;

  // ── Utilidades ──────────────────────────────────────────────────────────────

  function setTokens(token, refreshToken) {
    _token = token;
    if (refreshToken) _refreshToken = refreshToken;
    localStorage.setItem('dforzze_token', token);
    if (refreshToken) localStorage.setItem('dforzze_refresh_token', refreshToken);
  }

  function clearTokens() {
    _token = null;
    _refreshToken = null;
    localStorage.removeItem('dforzze_token');
    localStorage.removeItem('dforzze_refresh_token');
  }

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Realiza una petición HTTP con retry y refresh token automático
   */
  async function request(method, path, body = null, retries = 3) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await fetch(`${BASE_URL}${path}`, options);

        // Token expirado — intentar refresh
        if (res.status === 401 && _refreshToken && attempt === 0) {
          const refreshed = await _refreshAccessToken();
          if (refreshed) {
            headers['Authorization'] = `Bearer ${_token}`;
            options.headers = headers;
            continue;
          }
        }

        const data = await res.json();
        if (!res.ok) throw Object.assign(new Error(data.error || 'Error del servidor'), { status: res.status, data });
        return data;
      } catch (err) {
        if (attempt < retries - 1 && err.name !== 'Error') {
          await sleep(Math.pow(2, attempt) * 500); // backoff exponencial
          continue;
        }
        throw err;
      }
    }
  }

  async function _refreshAccessToken() {
    if (!_refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });
      if (!res.ok) { clearTokens(); return false; }
      const data = await res.json();
      setTokens(data.data.token, null);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async function register(name, email, password) {
    const data = await request('POST', '/auth/register', { name, email, password });
    setTokens(data.data.token, data.data.refreshToken);
    localStorage.setItem('dforzze_user', JSON.stringify(data.data.user));
    return data.data;
  }

  async function login(email, password) {
    const data = await request('POST', '/auth/login', { email, password });
    setTokens(data.data.token, data.data.refreshToken);
    localStorage.setItem('dforzze_user', JSON.stringify(data.data.user));
    return data.data;
  }

  async function logout() {
    try { await request('POST', '/auth/logout'); } catch {}
    clearTokens();
    localStorage.removeItem('dforzze_user');
    if (_socket) { _socket.disconnect(); _socket = null; }
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('dforzze_user')); } catch { return null; }
  }

  function isLoggedIn() { return !!_token && !!getCurrentUser(); }

  // ── Productos ───────────────────────────────────────────────────────────────

  async function getProducts(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await request('GET', `/products${params ? '?' + params : ''}`);
    return data.data;
  }

  async function getProduct(id) {
    const data = await request('GET', `/products/${id}`);
    return data.data;
  }

  async function updateStock(productId, stock, reason) {
    const data = await request('PATCH', `/products/${productId}/stock`, { stock, reason });
    return data.data;
  }

  // ── Pedidos ─────────────────────────────────────────────────────────────────

  async function createOrder(orderData) {
    const data = await request('POST', '/orders', orderData);
    return data.data;
  }

  async function getOrders(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await request('GET', `/orders${params ? '?' + params : ''}`);
    return data.data;
  }

  async function getOrder(id) {
    const data = await request('GET', `/orders/${id}`);
    return data.data;
  }

  // ── Inventario (admin) ──────────────────────────────────────────────────────

  async function getInventoryMovements(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const data = await request('GET', `/inventory/movements${params ? '?' + params : ''}`);
    return data.data;
  }

  async function getInventoryAlerts() {
    const data = await request('GET', '/inventory/alerts');
    return data.data;
  }

  async function acknowledgeAlert(alertId) {
    return request('PATCH', `/inventory/alerts/${alertId}/acknowledge`);
  }

  // ── Stickers ────────────────────────────────────────────────────────────────

  async function getMyStickers() {
    const data = await request('GET', '/stickers/my-collection');
    return data.data;
  }

  async function redeemSticker(code) {
    const data = await request('POST', '/stickers/redeem', { code });
    return data.data;
  }

  // ── WebSocket ───────────────────────────────────────────────────────────────

  function connectWebSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.io client no cargado. Agrega el script de socket.io.');
      return;
    }

    const wsUrl = window.DFORZZE_WS_URL || 'https://dforzze-backend.onrender.com';
    _socket = io(wsUrl, {
      auth: { token: _token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    _socket.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      document.dispatchEvent(new CustomEvent('dforzze:ws_connected'));
    });

    _socket.on('stock_update', (payload) => {
      document.dispatchEvent(new CustomEvent('dforzze:stock_update', { detail: payload }));
    });

    _socket.on('order_confirmed', (payload) => {
      document.dispatchEvent(new CustomEvent('dforzze:order_confirmed', { detail: payload }));
    });

    _socket.on('disconnect', () => {
      document.dispatchEvent(new CustomEvent('dforzze:ws_disconnected'));
    });

    return _socket;
  }

  function subscribeToProduct(productId) {
    if (_socket) _socket.emit('subscribe:product', productId);
  }

  function unsubscribeFromProduct(productId) {
    if (_socket) _socket.emit('unsubscribe:product', productId);
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  return {
    // Auth
    register, login, logout, getCurrentUser, isLoggedIn,
    // Productos
    getProducts, getProduct, updateStock,
    // Pedidos
    createOrder, getOrders, getOrder,
    // Inventario
    getInventoryMovements, getInventoryAlerts, acknowledgeAlert,
    // Stickers
    getMyStickers, redeemSticker,
    // WebSocket
    connectWebSocket, subscribeToProduct, unsubscribeFromProduct,
  };
})();

// Exportar para uso en módulos o como global
if (typeof module !== 'undefined') module.exports = DforzzeAPI;
