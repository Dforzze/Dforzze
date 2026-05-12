/**
 * OPTIMIZACIONES DE RENDIMIENTO Y RESPONSIVIDAD - DFORZZE
 * Task 11: Optimizar rendimiento y responsividad
 * Incluye: lazy loading, caching, compresión, offline, error handling
 */

// ===== SISTEMA DE CACHING INTELIGENTE =====
const CacheManager = {
  CACHE_KEYS: {
    USERS: 'dforzze_cache_users',
    STICKERS: 'dforzze_cache_stickers',
    CODES: 'dforzze_cache_codes',
    ANALYTICS: 'dforzze_cache_analytics',
    METADATA: 'dforzze_cache_metadata'
  },
  
  CACHE_DURATION: {
    USERS: 5 * 60 * 1000, // 5 minutos
    STICKERS: 10 * 60 * 1000, // 10 minutos
    CODES: 15 * 60 * 1000, // 15 minutos
    ANALYTICS: 30 * 60 * 1000, // 30 minutos
    METADATA: 60 * 60 * 1000 // 1 hora
  },
  
  set: function(key, data, duration) {
    try {
      const cacheEntry = {
        data: data,
        timestamp: Date.now(),
        duration: duration || 5 * 60 * 1000
      };
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      return false;
    }
  },
  
  get: function(key) {
    try {
      const cacheEntry = JSON.parse(localStorage.getItem(key));
      if (!cacheEntry) return null;
      
      const now = Date.now();
      const age = now - cacheEntry.timestamp;
      
      if (age > cacheEntry.duration) {
        localStorage.removeItem(key);
        return null;
      }
      
      return cacheEntry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  },
  
  invalidate: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Cache invalidate error:', error);
      return false;
    }
  },
  
  invalidateAll: function() {
    try {
      Object.values(this.CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.warn('Cache invalidate all error:', error);
      return false;
    }
  },
  
  getStats: function() {
    try {
      let totalSize = 0;
      let cacheCount = 0;
      
      Object.values(this.CACHE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          cacheCount++;
        }
      });
      
      return {
        cacheCount: cacheCount,
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { cacheCount: 0, totalSize: 0, totalSizeKB: 0 };
    }
  }
};

// ===== SISTEMA DE LAZY LOADING =====
const LazyLoader = {
  loadedComponents: new Set(),
  
  loadComponent: function(componentName, callback) {
    if (this.loadedComponents.has(componentName)) {
      if (callback) callback(true);
      return;
    }
    
    // Simular carga asincrónica
    setTimeout(() => {
      this.loadedComponents.add(componentName);
      if (callback) callback(true);
    }, 100);
  },
  
  loadComponentsInViewport: function() {
    if (typeof IntersectionObserver === 'undefined') {
      return false;
    }
    
    const elements = document.querySelectorAll('[data-lazy-load]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const componentName = entry.target.getAttribute('data-lazy-load');
          this.loadComponent(componentName, () => {
            entry.target.classList.add('loaded');
          });
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    elements.forEach(el => observer.observe(el));
    return true;
  },
  
  isComponentLoaded: function(componentName) {
    return this.loadedComponents.has(componentName);
  }
};

// ===== SISTEMA DE COMPRESIÓN DE DATOS =====
const DataCompression = {
  compress: function(data) {
    try {
      const json = JSON.stringify(data);
      // Usar compresión simple: eliminar espacios y caracteres innecesarios
      return json.replace(/\s+/g, '');
    } catch (error) {
      console.warn('Compression error:', error);
      return JSON.stringify(data);
    }
  },
  
  decompress: function(compressedData) {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.warn('Decompression error:', error);
      return null;
    }
  },
  
  getCompressionRatio: function(originalData) {
    try {
      const original = JSON.stringify(originalData);
      const compressed = this.compress(originalData);
      const ratio = ((1 - compressed.length / original.length) * 100).toFixed(2);
      return {
        originalSize: original.length,
        compressedSize: compressed.length,
        ratio: ratio + '%'
      };
    } catch (error) {
      console.warn('Compression ratio error:', error);
      return null;
    }
  }
};

// ===== SISTEMA DE SINCRONIZACIÓN OFFLINE =====
const OfflineSync = {
  syncQueue: [],
  isOnline: navigator.onLine,
  
  init: function() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingOperations();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  },
  
  queueOperation: function(operation) {
    try {
      this.syncQueue.push({
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: operation,
        timestamp: new Date().toISOString(),
        retries: 0,
        maxRetries: 3
      });
      
      this.saveSyncQueue();
      return true;
    } catch (error) {
      console.warn('Queue operation error:', error);
      return false;
    }
  },
  
  saveSyncQueue: function() {
    try {
      localStorage.setItem('dforzze_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Save sync queue error:', error);
    }
  },
  
  loadSyncQueue: function() {
    try {
      const queue = JSON.parse(localStorage.getItem('dforzze_sync_queue') || '[]');
      this.syncQueue = queue;
      return queue;
    } catch (error) {
      console.warn('Load sync queue error:', error);
      return [];
    }
  },
  
  syncPendingOperations: function() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }
    
    const operationsToSync = [...this.syncQueue];
    
    operationsToSync.forEach((item, index) => {
      try {
        // Ejecutar operación
        if (typeof item.operation === 'function') {
          item.operation();
        }
        
        // Remover de la cola
        this.syncQueue = this.syncQueue.filter(op => op.id !== item.id);
      } catch (error) {
        item.retries++;
        if (item.retries >= item.maxRetries) {
          this.syncQueue = this.syncQueue.filter(op => op.id !== item.id);
        }
      }
    });
    
    this.saveSyncQueue();
  },
  
  getQueueStatus: function() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      queue: this.syncQueue
    };
  }
};

// ===== SISTEMA DE OPTIMIZACIÓN DE ANIMACIONES =====
const AnimationOptimizer = {
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  shouldAnimate: function() {
    return !this.prefersReducedMotion;
  },
  
  getAnimationDuration: function(baseTime) {
    if (this.prefersReducedMotion) {
      return 0;
    }
    
    // Reducir duración en dispositivos de baja potencia
    if (this.isLowPowerDevice()) {
      return baseTime * 0.5;
    }
    
    return baseTime;
  },
  
  isLowPowerDevice: function() {
    // Detectar dispositivos de baja potencia
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return true;
    }
    
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
      return true;
    }
    
    return false;
  },
  
  optimizeAnimation: function(element, animation) {
    if (!this.shouldAnimate()) {
      // Aplicar cambios instantáneamente
      if (animation.onComplete) {
        animation.onComplete();
      }
      return;
    }
    
    const duration = this.getAnimationDuration(animation.duration || 400);
    
    // Usar requestAnimationFrame para mejor rendimiento
    let startTime = null;
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (animation.onFrame) {
        animation.onFrame(progress);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (animation.onComplete) {
          animation.onComplete();
        }
      }
    };
    
    requestAnimationFrame(animate);
  }
};

// ===== SISTEMA DE MONITOREO DE RENDIMIENTO =====
const PerformanceMonitor = {
  metrics: {},
  
  startMeasure: function(label) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${label}-start`);
    }
  },
  
  endMeasure: function(label) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(label, `${label}-start`);
        const measure = performance.getEntriesByName(label)[0];
        this.metrics[label] = measure.duration;
        return measure.duration;
      } catch (error) {
        console.warn('Performance measure error:', error);
        return null;
      }
    }
  },
  
  getMetrics: function() {
    return this.metrics;
  },
  
  getAverageLoadTime: function() {
    const times = Object.values(this.metrics);
    if (times.length === 0) return 0;
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  },
  
  logMetrics: function() {
    console.log('Performance Metrics:', this.metrics);
    console.log('Average Load Time:', this.getAverageLoadTime() + 'ms');
  }
};

// ===== SISTEMA DE MANEJO DE ERRORES RESILIENTE =====
const ResilientErrorHandler = {
  errorLog: [],
  maxErrorLog: 100,
  
  handle: function(error, context = {}) {
    try {
      const errorEntry = {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        message: error.message || String(error),
        stack: error.stack || '',
        context: context,
        severity: this.determineSeverity(error)
      };
      
      this.errorLog.push(errorEntry);
      
      if (this.errorLog.length > this.maxErrorLog) {
        this.errorLog.shift();
      }
      
      // Guardar en localStorage
      try {
        localStorage.setItem('dforzze_error_log', JSON.stringify(this.errorLog));
      } catch (e) {
        console.warn('Could not save error log:', e);
      }
      
      // Log en consola
      console.error(`[${errorEntry.severity}] ${errorEntry.message}`, context);
      
      return errorEntry;
    } catch (e) {
      console.error('Error handler failed:', e);
      return null;
    }
  },
  
  determineSeverity: function(error) {
    if (error.message.includes('Network') || error.message.includes('offline')) {
      return 'warning';
    }
    if (error.message.includes('Storage') || error.message.includes('quota')) {
      return 'critical';
    }
    return 'error';
  },
  
  getErrorLog: function() {
    return this.errorLog;
  },
  
  clearErrorLog: function() {
    this.errorLog = [];
    localStorage.removeItem('dforzze_error_log');
  }
};

// ===== SISTEMA DE DETECCIÓN DE CONEXIÓN =====
const ConnectionMonitor = {
  isOnline: navigator.onLine,
  connectionType: this.getConnectionType(),
  listeners: [],
  
  init: function() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners('online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners('offline');
    });
  },
  
  getConnectionType: function() {
    if (navigator.connection) {
      return navigator.connection.effectiveType;
    }
    return 'unknown';
  },
  
  isSlowConnection: function() {
    const type = this.getConnectionType();
    return type === '2g' || type === '3g' || type === 'slow-4g';
  },
  
  subscribe: function(callback) {
    this.listeners.push(callback);
  },
  
  notifyListeners: function(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.warn('Listener error:', error);
      }
    });
  },
  
  getStatus: function() {
    return {
      isOnline: this.isOnline,
      connectionType: this.getConnectionType(),
      isSlowConnection: this.isSlowConnection()
    };
  }
};

// ===== INICIALIZACIÓN =====
if (typeof window !== 'undefined') {
  window.CacheManager = CacheManager;
  window.LazyLoader = LazyLoader;
  window.DataCompression = DataCompression;
  window.OfflineSync = OfflineSync;
  window.AnimationOptimizer = AnimationOptimizer;
  window.PerformanceMonitor = PerformanceMonitor;
  window.ResilientErrorHandler = ResilientErrorHandler;
  window.ConnectionMonitor = ConnectionMonitor;
  
  // Inicializar sistemas
  OfflineSync.init();
  OfflineSync.loadSyncQueue();
  ConnectionMonitor.init();
}
