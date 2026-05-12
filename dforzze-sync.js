// ============================================================
// DFORZZE SYNC — Base de datos compartida via JSONBin.io
// Todos los usuarios ven los mismos datos en tiempo real
// ============================================================

var DforzzeSync = (function(){

  var MASTER_KEY = '$2a$10$1WTP.tBFPh4PeC7/iUb9COVLtPfZu8/h4CDwpZqbICHAOTXnN3ng.';
  var ACCESS_KEY = '$2a$10$Sz4NVHKK77NmJwPMbaLJ4eUyLZrumDqQK3A7C5m3nIM9cw7CTN9Jm';
  var BINS = {
    users:    '6a028dc0adc21f119a88447f',
    orders:   '6a028dc1adc21f119a884480',
    products: '6a028dc2adc21f119a884481'
  };
  var BASE = 'https://api.jsonbin.io/v3/b/';

  function headers(write){
    return {
      'Content-Type': 'application/json',
      'X-Master-Key': MASTER_KEY,
      'X-Access-Key': ACCESS_KEY
    };
  }

  // ── Leer bin ──────────────────────────────────────────────
  function read(bin, cb){
    fetch(BASE + BINS[bin] + '/latest', { headers: headers() })
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(null, d.record); })
      .catch(function(e){ cb(e, null); });
  }

  // ── Escribir bin (reemplaza todo) ─────────────────────────
  function write(bin, data, cb){
    fetch(BASE + BINS[bin], {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(data)
    })
      .then(function(r){ return r.json(); })
      .then(function(d){ if(cb) cb(null, d); })
      .catch(function(e){ if(cb) cb(e, null); });
  }

  // ══════════════════════════════════════════════════════════
  // USUARIOS
  // ══════════════════════════════════════════════════════════

  function getUsers(cb){
    read('users', function(err, data){
      cb(err ? [] : (data.users || []));
    });
  }

  function saveUser(user, cb){
    getUsers(function(users){
      var idx = users.findIndex(function(u){ return u.email === user.email; });
      if(idx >= 0) users[idx] = user;
      else users.push(user);
      write('users', { users: users }, function(){ if(cb) cb(); });
    });
  }

  function getUser(email, cb){
    getUsers(function(users){
      cb(users.find(function(u){ return u.email === email; }) || null);
    });
  }

  // ══════════════════════════════════════════════════════════
  // PEDIDOS
  // ══════════════════════════════════════════════════════════

  function getOrders(cb){
    read('orders', function(err, data){
      cb(err ? [] : (data.orders || []));
    });
  }

  function saveOrder(order, cb){
    getOrders(function(orders){
      orders.unshift(order);
      write('orders', { orders: orders }, function(){ if(cb) cb(); });
    });
  }

  // ══════════════════════════════════════════════════════════
  // PRODUCTOS
  // ══════════════════════════════════════════════════════════

  function getProducts(cb){
    read('products', function(err, data){
      var prods = err ? [] : (data.products || []);
      // Si no hay productos en la nube, usar defaults del código
      if(prods.length === 0 && typeof DEFAULT_PRODUCTS !== 'undefined'){
        prods = DEFAULT_PRODUCTS;
        write('products', { products: prods }, null);
      }
      cb(prods);
    });
  }

  function saveProducts(products, cb){
    write('products', { products: products }, function(){ if(cb) cb(); });
  }

  // ══════════════════════════════════════════════════════════
  // AUTH — registro y login compartido
  // ══════════════════════════════════════════════════════════

  function register(name, email, password, cb){
    getUsers(function(users){
      if(users.find(function(u){ return u.email === email; })){
        cb({ error: 'Este email ya está registrado' }, null);
        return;
      }
      var user = {
        name: name,
        email: email,
        password: password, // en producción hashear
        rank: 'NONE',
        stickerCount: 0,
        stickers: [],
        image: null,
        role: 'USER',
        createdAt: new Date().toLocaleDateString('es-PE'),
        blocked: false,
        preferences: { animationsEnabled: true, celebrationsEnabled: true, tutorialCompleted: false },
        achievements: [],
        lastActivity: new Date().toISOString()
      };
      users.push(user);
      write('users', { users: users }, function(){
        cb(null, user);
      });
    });
  }

  function login(email, password, cb){
    getUsers(function(users){
      var user = users.find(function(u){ return u.email === email && u.password === password; });
      if(!user){
        cb({ error: 'Email o contraseña incorrectos' }, null);
        return;
      }
      if(user.blocked){
        cb({ error: 'Tu cuenta ha sido bloqueada' }, null);
        return;
      }
      user.lastActivity = new Date().toISOString();
      saveUser(user, null);
      cb(null, user);
    });
  }

  return {
    getUsers: getUsers,
    saveUser: saveUser,
    getUser: getUser,
    getOrders: getOrders,
    saveOrder: saveOrder,
    getProducts: getProducts,
    saveProducts: saveProducts,
    register: register,
    login: login
  };

})();
