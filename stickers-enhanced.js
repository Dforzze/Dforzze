/**
 * SISTEMA DE STICKERS MEJORADO - DFORZZE
 * Archivo de funcionalidades mejoradas para el sistema de stickers
 * Mantiene 100% compatibilidad con código existente
 */

// ===== CONFIGURACIÓN DEL SISTEMA =====
const SystemConfig = {
  animations: {
    enabled: true,
    duration: {
      progress: 800,
      celebration: 3000,
      sticker: 400
    }
  },
  ui: {
    theme: 'default',
    stickerIcons: {
      standard: '◆',
      special: '⬢',
      event: '✦'
    }
  },
  gamification: {
    celebrationsEnabled: true,
    achievementsEnabled: true,
    soundEnabled: false
  }
};

// ===== VALIDACIÓN DE DATOS MEJORADA =====
const DataValidator = {
  validateUser: function(userData) {
    const required = ['name', 'email', 'rank'];
    const missing = required.filter(field => !userData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!RANK_ORDER.includes(userData.rank)) {
      userData.rank = 'NONE';
    }
    
    if (typeof userData.stickerCount !== 'number' || userData.stickerCount < 0) {
      userData.stickerCount = 0;
    }
    
    // Asegurar que tiene las nuevas propiedades
    if (!userData.preferences) {
      userData.preferences = {
        animationsEnabled: true,
        celebrationsEnabled: true,
        tutorialCompleted: false
      };
    }
    
    if (!userData.achievements) {
      userData.achievements = [];
    }
    
    if (!userData.lastActivity) {
      userData.lastActivity = new Date().toISOString();
    }
    
    return userData;
  },
  
  validateStickerCode: function(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Código inválido' };
    }
    
    if (code.length < 6 || code.length > 20) {
      return { valid: false, error: 'Longitud de código incorrecta' };
    }
    
    if (!/^[A-Z0-9-]+$/.test(code)) {
      return { valid: false, error: 'Formato de código inválido' };
    }
    
    return { valid: true };
  }
};

// ===== 10.1: SISTEMA DE MIGRACIÓN DE DATOS =====
const DataMigrationSystem = {
  // Crear respaldo completo de datos existentes
  createFullBackup: function() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          users: JSON.parse(localStorage.getItem('dforzze_users') || '[]'),
          codes: JSON.parse(localStorage.getItem('dforzze_codes') || '[]'),
          orders: JSON.parse(localStorage.getItem('dforzze_orders') || '[]'),
          auditLog: JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]'),
          securityAlerts: JSON.parse(localStorage.getItem('dforzze_security_alerts') || '[]')
        },
        checksum: null
      };
      
      // Calcular checksum para validación de integridad
      backup.checksum = this.calculateChecksum(backup.data);
      
      const backupKey = `dforzze_migration_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      
      return {
        success: true,
        backupKey: backupKey,
        timestamp: backup.timestamp,
        message: 'Respaldo completo creado exitosamente'
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Implementar migración automática preservando todos los datos
  performMigration: function(backupKey = null) {
    try {
      // Crear respaldo antes de migrar
      const backupResult = this.createFullBackup();
      if (!backupResult.success) {
        return {
          success: false,
          error: 'No se pudo crear respaldo antes de migración'
        };
      }
      
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let migratedCount = 0;
      const changes = [];
      
      // Migrar cada usuario preservando todos los datos
      users.forEach(user => {
        const originalUser = JSON.parse(JSON.stringify(user));
        
        // Validar y preservar datos existentes
        user = DataValidator.validateUser(user);
        
        // Asegurar que tiene todas las propiedades necesarias
        if (!user.createdAt) {
          user.createdAt = new Date().toISOString();
        }
        
        if (!user.stickers) {
          user.stickers = [];
        }
        
        // Preservar datos de autenticación
        if (!user.authToken) {
          user.authToken = originalUser.authToken || null;
        }
        
        // Registrar cambios
        const userChanges = this.detectChanges(originalUser, user);
        if (userChanges.length > 0) {
          changes.push({
            email: user.email,
            changes: userChanges
          });
        }
        
        migratedCount++;
      });
      
      // Guardar usuarios migrados
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      // Validar integridad post-migración
      const integrityCheck = this.validateMigrationIntegrity(users);
      
      if (!integrityCheck.valid) {
        return {
          success: false,
          error: 'Validación de integridad falló post-migración',
          details: integrityCheck.errors
        };
      }
      
      return {
        success: true,
        migratedCount: migratedCount,
        changes: changes,
        backupKey: backupResult.backupKey,
        integrityCheck: integrityCheck,
        message: `${migratedCount} usuarios migrados exitosamente`
      };
    } catch (error) {
      console.error('Error during migration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Detectar cambios entre datos originales y migrados
  detectChanges: function(original, migrated) {
    const changes = [];
    
    // Verificar campos nuevos añadidos
    Object.keys(migrated).forEach(key => {
      if (!(key in original)) {
        changes.push({
          type: 'field_added',
          field: key,
          value: migrated[key]
        });
      }
    });
    
    // Verificar cambios en campos existentes
    Object.keys(original).forEach(key => {
      if (key in migrated && JSON.stringify(original[key]) !== JSON.stringify(migrated[key])) {
        changes.push({
          type: 'field_modified',
          field: key,
          oldValue: original[key],
          newValue: migrated[key]
        });
      }
    });
    
    return changes;
  },
  
  // Validar integridad de datos post-migración
  validateMigrationIntegrity: function(users) {
    const errors = [];
    
    // Validar que no hay usuarios duplicados
    const emails = new Set();
    users.forEach(user => {
      if (emails.has(user.email)) {
        errors.push(`Usuario duplicado: ${user.email}`);
      }
      emails.add(user.email);
    });
    
    // Validar que todos los usuarios tienen campos requeridos
    users.forEach(user => {
      if (!user.name || !user.email || !user.rank) {
        errors.push(`Usuario incompleto: ${user.email}`);
      }
      
      if (typeof user.stickerCount !== 'number' || user.stickerCount < 0) {
        errors.push(`Sticker count inválido para: ${user.email}`);
      }
      
      if (!RANK_ORDER.includes(user.rank)) {
        errors.push(`Rango inválido para: ${user.email}`);
      }
    });
    
    // Validar que los stickers están en el rango correcto
    users.forEach(user => {
      const expectedRank = this.calculateExpectedRank(user.stickerCount);
      if (user.rank !== expectedRank) {
        errors.push(`Rango inconsistente para ${user.email}: esperado ${expectedRank}, encontrado ${user.rank}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors,
      totalUsers: users.length,
      validUsers: users.length - errors.length
    };
  },
  
  // Calcular rango esperado basado en sticker count
  calculateExpectedRank: function(stickerCount) {
    if (stickerCount >= 15) return 'INNER';
    if (stickerCount >= 7) return 'BUILDER';
    if (stickerCount >= 3) return 'INITIATED';
    return 'NONE';
  },
  
  // Calcular checksum para validación de integridad
  calculateChecksum: function(data) {
    try {
      const dataString = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    } catch (error) {
      return null;
    }
  },
  
  // Restaurar desde respaldo
  restoreFromBackup: function(backupKey) {
    try {
      const backup = JSON.parse(localStorage.getItem(backupKey));
      
      if (!backup || !backup.data) {
        return {
          success: false,
          error: 'Respaldo no encontrado o inválido'
        };
      }
      
      // Verificar checksum
      const currentChecksum = this.calculateChecksum(backup.data);
      if (currentChecksum !== backup.checksum) {
        return {
          success: false,
          error: 'Checksum no coincide - respaldo puede estar corrupto'
        };
      }
      
      // Restaurar datos
      localStorage.setItem('dforzze_users', JSON.stringify(backup.data.users));
      localStorage.setItem('dforzze_codes', JSON.stringify(backup.data.codes));
      localStorage.setItem('dforzze_orders', JSON.stringify(backup.data.orders));
      localStorage.setItem('dforzze_audit_log', JSON.stringify(backup.data.auditLog));
      localStorage.setItem('dforzze_security_alerts', JSON.stringify(backup.data.securityAlerts));
      
      return {
        success: true,
        message: 'Datos restaurados exitosamente desde respaldo',
        timestamp: backup.timestamp
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Obtener lista de respaldos disponibles
  getAvailableBackups: function() {
    try {
      const backups = [];
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith('dforzze_migration_backup_')) {
          try {
            const backup = JSON.parse(localStorage.getItem(key));
            backups.push({
              key: key,
              timestamp: backup.timestamp,
              version: backup.version,
              dataCount: {
                users: backup.data.users.length,
                codes: backup.data.codes.length,
                orders: backup.data.orders.length
              }
            });
          } catch (e) {
            // Ignorar respaldos corruptos
          }
        }
      });
      
      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error getting available backups:', error);
      return [];
    }
  },
  
  // Limpiar respaldos antiguos (mantener solo los últimos 5)
  cleanupOldBackups: function(keepCount = 5) {
    try {
      const backups = this.getAvailableBackups();
      
      if (backups.length > keepCount) {
        const backupsToDelete = backups.slice(keepCount);
        backupsToDelete.forEach(backup => {
          localStorage.removeItem(backup.key);
        });
        
        return {
          success: true,
          deleted: backupsToDelete.length,
          message: `${backupsToDelete.length} respaldos antiguos eliminados`
        };
      }
      
      return {
        success: true,
        deleted: 0,
        message: 'No hay respaldos antiguos para eliminar'
      };
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// ===== MANEJO DE ERRORES =====
const ErrorHandler = {
  handleAnimationError: function(error, fallback) {
    console.warn('Animation failed, using fallback:', error);
    if (typeof fallback === 'function') {
      fallback();
    }
  },
  
  handleStorageError: function(error, operation) {
    console.error('Storage operation failed:', operation, error);
    this.showUserNotification('Error al guardar datos. Inténtalo de nuevo.', 'error');
  },
  
  handleRenderError: function(error, component) {
    console.error('Render error in component:', component, error);
  },
  
  showUserNotification: function(message, type = 'info') {
    try {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInUp 0.3s ease;
        max-width: 300px;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
};

// ===== SISTEMA DE PROGRESO MEJORADO =====
const ProgressSystem = {
  updateProgressWithAnimation: function() {
    if (!U) return;
    
    try {
      const cnt = U.stickerCount || 0;
      const curIdx = RANK_ORDER.indexOf(U.rank || 'NONE');
      const nextRank = RANK_ORDER[Math.min(curIdx + 1, RANK_ORDER.length - 1)];
      const nextRkData = RANKS[nextRank];
      
      // Actualizar milestones activos
      this.updateRankMilestones(U.rank || 'NONE');
      
      // Actualizar información de progreso en dforzze.html
      const currentStickersEl = document.getElementById('currentStickers');
      const nextRankStickersEl = document.getElementById('nextRankStickers');
      const progressPercentageEl = document.getElementById('progressPercentage');
      const progressFillEl = document.getElementById('progressFill');
      
      if (currentStickersEl) currentStickersEl.textContent = cnt;
      
      if (U.rank === 'INNER') {
        if (nextRankStickersEl) nextRankStickersEl.textContent = '15';
        if (progressPercentageEl) progressPercentageEl.textContent = '100%';
        if (progressFillEl) progressFillEl.style.width = '100%';
      } else {
        const needed = nextRkData.stk;
        const pct = Math.min((cnt / needed) * 100, 100);
        
        if (nextRankStickersEl) nextRankStickersEl.textContent = needed;
        if (progressPercentageEl) progressPercentageEl.textContent = Math.round(pct) + '%';
        
        if (progressFillEl) {
          setTimeout(() => {
            progressFillEl.style.width = pct + '%';
          }, 100);
        }
      }
      
      // Actualizar información de progreso en catalogo.html
      const catCurrentStickersEl = document.getElementById('catCurrentStickers');
      const catNextRankStickersEl = document.getElementById('catNextRankStickers');
      const catProgressPercentageEl = document.getElementById('catProgressPercentage');
      const catProgressFillEl = document.getElementById('catProgressFill');
      
      if (catCurrentStickersEl) catCurrentStickersEl.textContent = cnt;
      
      if (U.rank === 'INNER') {
        if (catNextRankStickersEl) catNextRankStickersEl.textContent = '15';
        if (catProgressPercentageEl) catProgressPercentageEl.textContent = '100%';
        if (catProgressFillEl) catProgressFillEl.style.width = '100%';
      } else {
        const needed = nextRkData.stk;
        const pct = Math.min((cnt / needed) * 100, 100);
        
        if (catNextRankStickersEl) catNextRankStickersEl.textContent = needed;
        if (catProgressPercentageEl) catProgressPercentageEl.textContent = Math.round(pct) + '%';
        
        if (catProgressFillEl) {
          setTimeout(() => {
            catProgressFillEl.style.width = pct + '%';
          }, 100);
        }
      }
      
    } catch (error) {
      ErrorHandler.handleRenderError(error, 'progress_update');
    }
  },
  
  updateRankMilestones: function(currentRank) {
    try {
      const milestones = document.querySelectorAll('.rank-milestone');
      const currentIndex = RANK_ORDER.indexOf(currentRank);
      
      milestones.forEach((milestone, index) => {
        const icon = milestone.querySelector('.milestone-icon');
        if (!icon) return;
        
        const rankKey = RANK_ORDER[index];
        const rankData = RANKS[rankKey];
        
        if (index <= currentIndex) {
          icon.style.borderColor = rankData.c;
          icon.style.background = rankData.c;
          icon.style.color = '#fff';
          icon.style.transform = 'scale(1.1)';
        } else {
          icon.style.borderColor = '#e9ecef';
          icon.style.background = '#fff';
          icon.style.color = '#6c757d';
          icon.style.transform = 'scale(1)';
        }
      });
    } catch (error) {
      ErrorHandler.handleAnimationError(error);
    }
  }
};

// ===== SISTEMA DE ANIMACIONES Y CELEBRACIONES =====
const AnimationSystem = {
  // 5.1: Implementar animaciones de canje exitoso
  showStickerRedemptionAnimation: function(stickerData) {
    if (!SystemConfig.gamification.celebrationsEnabled || !U.preferences.celebrationsEnabled) {
      return;
    }
    
    try {
      // Crear overlay de celebración con animación de entrada
      const celebrationOverlay = document.createElement('div');
      celebrationOverlay.className = 'celebration-overlay';
      celebrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        transform: scale(0.9);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      
      // Obtener icono del sticker
      const stickerIcon = stickerData && stickerData.icon ? stickerData.icon : '◆';
      
      celebrationOverlay.innerHTML = `
        <div class="celebration-content" style="
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
          <div class="sticker-icon-large" style="
            font-size: 64px;
            margin-bottom: 16px;
            animation: bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            display: inline-block;
          ">${stickerIcon}</div>
          <h3 style="
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #000;
            animation: fadeInUp 0.5s ease-out 0.2s both;
          ">¡Sticker Ganado!</h3>
          <p style="
            color: #6c757d;
            margin-bottom: 24px;
            animation: fadeInUp 0.5s ease-out 0.3s both;
          ">+1 sticker añadido a tu colección</p>
          <div class="progress-update" style="
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            animation: fadeInUp 0.5s ease-out 0.4s both;
          ">
            <p style="
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 8px;
            ">Progreso actualizado</p>
            <div style="
              height: 4px;
              background: #e9ecef;
              border-radius: 2px;
              overflow: hidden;
            ">
              <div id="celebrationProgressBar" style="
                height: 100%;
                background: linear-gradient(90deg, #34d399, #fbbf24, #c084fc);
                width: 0;
                transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
              "></div>
            </div>
          </div>
          <button onclick="AnimationSystem.closeCelebration()" style="
            background: #000;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            animation: fadeInUp 0.5s ease-out 0.5s both;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#000'">Continuar</button>
        </div>
      `;
      
      document.body.appendChild(celebrationOverlay);
      
      // Animación de entrada del overlay
      setTimeout(() => {
        celebrationOverlay.style.opacity = '1';
        celebrationOverlay.style.transform = 'scale(1)';
      }, 50);
      
      // Actualizar progreso con animación
      setTimeout(() => {
        this.updateCelebrationProgress();
      }, 800);
      
      // Auto-cerrar después de 4 segundos
      setTimeout(() => {
        this.closeCelebration();
      }, 4000);
      
      window.currentCelebrationOverlay = celebrationOverlay;
      
    } catch (error) {
      ErrorHandler.handleAnimationError(error, () => {
        ErrorHandler.showUserNotification('¡Sticker canjeado exitosamente!', 'success');
      });
    }
  },
  
  updateCelebrationProgress: function() {
    if (!U) return;
    
    try {
      const cnt = U.stickerCount || 0;
      const curIdx = RANK_ORDER.indexOf(U.rank || 'NONE');
      const nextRank = RANK_ORDER[Math.min(curIdx + 1, RANK_ORDER.length - 1)];
      const nextRkData = RANKS[nextRank];
      
      const progressBar = document.getElementById('celebrationProgressBar');
      if (progressBar) {
        if (U.rank === 'INNER') {
          progressBar.style.width = '100%';
        } else {
          const pct = Math.min((cnt / nextRkData.stk) * 100, 100);
          progressBar.style.width = pct + '%';
        }
      }
    } catch (error) {
      ErrorHandler.handleAnimationError(error);
    }
  },
  
  closeCelebration: function() {
    const overlay = window.currentCelebrationOverlay;
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.1)';
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        delete window.currentCelebrationOverlay;
      }, 300);
    }
  },
  
  showRankAdvancementCelebration: function(newRank) {
    if (!SystemConfig.gamification.celebrationsEnabled || !U.preferences.celebrationsEnabled) {
      return;
    }
    
    try {
      const rankData = RANKS[newRank];
      const celebrationOverlay = document.createElement('div');
      celebrationOverlay.className = 'rank-celebration-overlay';
      celebrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      
      // 5.4: Crear animación especial para nuevo rango con efectos visuales premium
      celebrationOverlay.innerHTML = `
        <div class="rank-celebration-content" style="
          background: #fff;
          border-radius: 20px;
          padding: 50px;
          text-align: center;
          max-width: 450px;
          width: 90%;
          position: relative;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        ">
          <div class="rank-celebration-bg" style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 60%;
            background: linear-gradient(135deg, ${rankData.c}20, ${rankData.c}10);
            z-index: 0;
            animation: shimmer 2s infinite;
          "></div>
          <div style="position: relative; z-index: 1;">
            <div class="rank-icon-celebration" style="
              font-size: 80px;
              margin-bottom: 20px;
              animation: bounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
              display: inline-block;
            ">${rankData.icon}</div>
            <h2 style="
              font-size: 28px;
              font-weight: 800;
              margin-bottom: 12px;
              color: #000;
              animation: fadeInUp 0.5s ease-out 0.2s both;
            ">¡Nuevo Rango!</h2>
            <div style="
              background: ${rankData.bg};
              color: ${rankData.c};
              padding: 8px 20px;
              border-radius: 8px;
              font-weight: 700;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 16px;
              display: inline-block;
              animation: fadeInUp 0.5s ease-out 0.3s both;
            ">${rankData.l}</div>
            <p style="
              color: #6c757d;
              font-size: 16px;
              line-height: 1.5;
              margin-bottom: 30px;
              animation: fadeInUp 0.5s ease-out 0.4s both;
            ">¡Felicitaciones! Has alcanzado el rango <strong>${rankData.l}</strong> en DFORZZE. Acceso a nuevos beneficios exclusivos.</p>
            <button onclick="AnimationSystem.closeRankCelebration()" style="
              background: ${rankData.c};
              color: #fff;
              border: none;
              padding: 14px 28px;
              border-radius: 10px;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              animation: fadeInUp 0.5s ease-out 0.5s both;
              transition: all 0.2s ease;
            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">¡Increíble!</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(celebrationOverlay);
      
      // Animación de entrada con efecto premium
      setTimeout(() => {
        celebrationOverlay.style.opacity = '1';
        celebrationOverlay.style.transform = 'scale(1)';
      }, 100);
      
      // Auto-cerrar después de 5 segundos
      setTimeout(() => {
        this.closeRankCelebration();
      }, 5000);
      
      window.currentRankCelebrationOverlay = celebrationOverlay;
      
    } catch (error) {
      ErrorHandler.handleAnimationError(error, () => {
        ErrorHandler.showUserNotification('¡Has alcanzado el rango ' + RANKS[newRank].l + '!', 'success');
      });
    }
  },
  
  closeRankCelebration: function() {
    const overlay = window.currentRankCelebrationOverlay;
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        delete window.currentRankCelebrationOverlay;
      }, 400);
    }
  }
};

// ===== 5.3: SISTEMA DE NOTIFICACIONES NO INTRUSIVAS =====
const NotificationSystem = {
  // Cola de notificaciones para múltiples mensajes
  notificationQueue: [],
  isProcessing: false,
  
  // Mostrar notificación toast con animaciones suaves
  showToast: function(message, type = 'info', duration = 3000) {
    this.notificationQueue.push({ message, type, duration });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  },
  
  processQueue: function() {
    if (this.notificationQueue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const notification = this.notificationQueue.shift();
    
    try {
      const toast = document.createElement('div');
      toast.className = `notification-toast notification-${notification.type}`;
      
      // Determinar colores según tipo
      let bgColor, textColor, icon;
      switch(notification.type) {
        case 'success':
          bgColor = '#10b981';
          textColor = '#fff';
          icon = '✓';
          break;
        case 'error':
          bgColor = '#ef4444';
          textColor = '#fff';
          icon = '✕';
          break;
        case 'warning':
          bgColor = '#f59e0b';
          textColor = '#fff';
          icon = '⚠';
          break;
        default:
          bgColor = '#3b82f6';
          textColor = '#fff';
          icon = 'ℹ';
      }
      
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999;
        background: ${bgColor};
        color: ${textColor};
        padding: 14px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        display: flex;
        align-items: center;
        gap: 12px;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      
      toast.innerHTML = `
        <span style="font-size: 16px; flex-shrink: 0;">${icon}</span>
        <span style="flex: 1;">${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      // Animación de entrada
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      }, 50);
      
      // Animación de salida
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast);
          }
          
          // Procesar siguiente notificación
          this.processQueue();
        }, 300);
      }, notification.duration);
      
    } catch (error) {
      console.error('Error showing toast:', error);
      this.processQueue();
    }
  },
  
  // Métodos de conveniencia para diferentes tipos
  success: function(message, duration = 3000) {
    this.showToast(message, 'success', duration);
  },
  
  error: function(message, duration = 3000) {
    this.showToast(message, 'error', duration);
  },
  
  warning: function(message, duration = 3000) {
    this.showToast(message, 'warning', duration);
  },
  
  info: function(message, duration = 3000) {
    this.showToast(message, 'info', duration);
  }
};


// ===== 7.1: SISTEMA DE LOGROS Y BADGES =====
const AchievementSystem = {
  // 7.1: Badges visuales para cada rango alcanzado
  badges: {
    'sin_rango': {
      id: 'sin_rango',
      name: 'Iniciante',
      description: 'Bienvenido a DFORZZE',
      icon: '◆',
      color: '#6c757d',
      bg: '#f8f9fa',
      rank: 'NONE'
    },
    'initiated': {
      id: 'initiated',
      name: 'Iniciado',
      description: 'Primer paso en tu membresía',
      icon: '▲',
      color: '#10b981',
      bg: '#d1fae5',
      rank: 'INITIATED'
    },
    'builder': {
      id: 'builder',
      name: 'Constructor',
      description: 'Construyendo tu presencia',
      icon: '■',
      color: '#f59e0b',
      bg: '#fef3c7',
      rank: 'BUILDER'
    },
    'inner': {
      id: 'inner',
      name: 'Círculo Interno',
      description: 'Máximo nivel de membresía',
      icon: '●',
      color: '#c084fc',
      bg: '#f3e8ff',
      rank: 'INNER'
    }
  },
  
  achievements: {
    'first_sticker': {
      id: 'first_sticker',
      name: 'Primer Paso',
      description: 'Canjeaste tu primer sticker',
      icon: '◆',
      condition: function(user) { return (user.stickerCount || 0) >= 1; }
    },
    'initiated_rank': {
      id: 'initiated_rank',
      name: 'Iniciado',
      description: 'Alcanzaste el rango Initiated',
      icon: '▲',
      condition: function(user) { return user.rank === 'INITIATED' || user.rank === 'BUILDER' || user.rank === 'INNER'; }
    },
    'builder_rank': {
      id: 'builder_rank',
      name: 'Constructor',
      description: 'Alcanzaste el rango Builder',
      icon: '■',
      condition: function(user) { return user.rank === 'BUILDER' || user.rank === 'INNER'; }
    },
    'inner_rank': {
      id: 'inner_rank',
      name: 'Círculo Interno',
      description: 'Alcanzaste el rango Inner',
      icon: '●',
      condition: function(user) { return user.rank === 'INNER'; }
    },
    'collector': {
      id: 'collector',
      name: 'Coleccionista',
      description: 'Tienes 10 o más stickers',
      icon: '⬢',
      condition: function(user) { return (user.stickerCount || 0) >= 10; }
    },
    'milestone_5': {
      id: 'milestone_5',
      name: 'Hito: 5 Stickers',
      description: 'Alcanzaste 5 stickers',
      icon: '✦',
      condition: function(user) { return (user.stickerCount || 0) >= 5; }
    },
    'milestone_15': {
      id: 'milestone_15',
      name: 'Hito: 15 Stickers',
      description: 'Alcanzaste 15 stickers',
      icon: '⬢',
      condition: function(user) { return (user.stickerCount || 0) >= 15; }
    }
  },
  
  checkAndUnlockAchievements: function(user) {
    if (!user.achievements) user.achievements = [];
    
    const newAchievements = [];
    
    for (const achievementId in this.achievements) {
      const achievement = this.achievements[achievementId];
      
      if (user.achievements.indexOf(achievementId) !== -1) continue;
      
      if (achievement.condition(user)) {
        user.achievements.push(achievementId);
        newAchievements.push(achievement);
      }
    }
    
    if (newAchievements.length > 0) {
      setTimeout(() => {
        newAchievements.forEach((achievement, index) => {
          setTimeout(() => {
            this.showAchievementNotification(achievement);
          }, index * 1000);
        });
      }, 2000);
    }
    
    return newAchievements;
  },
  
  showAchievementNotification: function(achievement) {
    if (!SystemConfig.gamification.achievementsEnabled) return;
    
    try {
      const notification = document.createElement('div');
      notification.className = 'achievement-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1002;
        background: linear-gradient(135deg, #000, #333);
        color: #fff;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.4s ease;
        max-width: 300px;
        border: 1px solid rgba(255,255,255,0.1);
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">${achievement.icon}</div>
          <div>
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">¡Logro Desbloqueado!</div>
            <div style="font-weight: 600; font-size: 13px; color: #fff; margin-bottom: 2px;">${achievement.name}</div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">${achievement.description}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 400);
      }, 4000);
      
    } catch (error) {
      ErrorHandler.handleAnimationError(error);
    }
  },
  
  // 7.1: Renderizar badges visuales para cada rango
  renderRankBadge: function(rank) {
    const badge = this.badges[rank === 'NONE' ? 'sin_rango' : rank.toLowerCase()];
    if (!badge) return '';
    
    return `
      <div class="rank-badge" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        background: ${badge.bg};
        border-radius: 12px;
        border: 2px solid ${badge.color};
        text-align: center;
      ">
        <div style="
          font-size: 48px;
          animation: bounce 0.6s ease;
        ">${badge.icon}</div>
        <div>
          <div style="
            font-weight: 700;
            font-size: 16px;
            color: ${badge.color};
            margin-bottom: 4px;
          ">${badge.name}</div>
          <div style="
            font-size: 12px;
            color: rgba(0,0,0,0.6);
          ">${badge.description}</div>
        </div>
      </div>
    `;
  },
  
  // 7.1: Renderizar colección de logros en perfil
  renderAchievementsCollection: function(user) {
    if (!user.achievements) user.achievements = [];
    
    let achievementsHtml = '';
    let unlockedCount = 0;
    
    // Renderizar badges de rangos primero
    achievementsHtml += `
      <div style="margin-bottom: 24px;">
        <h4 style="
          font-size: 13px;
          font-weight: 700;
          color: #000;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">Rangos Alcanzados</h4>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        ">
    `;
    
    // Mostrar badges de rangos
    const rankBadges = ['sin_rango', 'initiated', 'builder', 'inner'];
    rankBadges.forEach(badgeId => {
      const badge = this.badges[badgeId];
      const isUnlocked = user.rank === badge.rank || 
                        (badge.rank === 'NONE' && !user.rank) ||
                        (badge.rank === 'INITIATED' && ['INITIATED', 'BUILDER', 'INNER'].includes(user.rank)) ||
                        (badge.rank === 'BUILDER' && ['BUILDER', 'INNER'].includes(user.rank)) ||
                        (badge.rank === 'INNER' && user.rank === 'INNER');
      
      achievementsHtml += `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: ${isUnlocked ? badge.bg : 'rgba(0,0,0,0.05)'};
          border-radius: 8px;
          border: 2px solid ${isUnlocked ? badge.color : 'rgba(0,0,0,0.1)'};
          text-align: center;
          ${isUnlocked ? '' : 'opacity: 0.5'};
        ">
          <div style="
            font-size: 28px;
            filter: ${isUnlocked ? 'none' : 'grayscale(1)'};
          ">${badge.icon}</div>
          <div style="
            font-weight: 600;
            font-size: 11px;
            color: ${isUnlocked ? badge.color : '#6c757d'};
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">${badge.name}</div>
        </div>
      `;
    });
    
    achievementsHtml += `</div></div>`;
    
    // Renderizar logros especiales
    achievementsHtml += `
      <div>
        <h4 style="
          font-size: 13px;
          font-weight: 700;
          color: #000;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">Logros Especiales</h4>
        <div style="
          display: flex;
          flex-direction: column;
          gap: 8px;
        ">
    `;
    
    for (const achievementId in this.achievements) {
      const achievement = this.achievements[achievementId];
      const isUnlocked = user.achievements.indexOf(achievementId) !== -1;
      
      if (isUnlocked) unlockedCount++;
      
      achievementsHtml += `
        <div class="achievement-item" style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: ${isUnlocked ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)'};
          border-radius: 8px;
          border-left: 3px solid ${isUnlocked ? '#000' : 'rgba(0,0,0,0.1)'};
          ${isUnlocked ? '' : 'opacity: 0.5'};
        ">
          <div style="
            font-size: 20px;
            filter: ${isUnlocked ? 'none' : 'grayscale(1)'};
          ">${achievement.icon}</div>
          <div style="flex: 1;">
            <div style="
              font-weight: 600;
              font-size: 12px;
              color: #000;
              margin-bottom: 2px;
            ">${achievement.name}</div>
            <div style="
              font-size: 11px;
              color: #6c757d;
            ">${achievement.description}</div>
          </div>
          ${isUnlocked ? '<div style="color: #10b981; font-size: 16px;">✓</div>' : ''}
        </div>
      `;
    }
    
    achievementsHtml += `</div></div>`;
    
    return {
      html: achievementsHtml,
      unlockedCount: unlockedCount,
      totalCount: Object.keys(this.achievements).length
    };
  }
};

// ===== 7.2: SISTEMA DE ELEMENTOS MOTIVACIONALES =====
const MotivationalSystem = {
  // 7.2: Mensajes de progreso personalizados
  motivationalMessages: {
    'NONE': [
      '¡Bienvenido a DFORZZE! Canjea tu primer sticker para comenzar.',
      'Cada sticker te acerca a nuevos beneficios exclusivos.',
      'Tu membresía comienza aquí. ¡Adelante!'
    ],
    'INITIATED': [
      '¡Excelente! Ya eres parte del círculo Initiated.',
      'Estás en el camino correcto. Sigue canjeando stickers.',
      'Tu dedicación está siendo recompensada. ¡Continúa!'
    ],
    'BUILDER': [
      '¡Increíble progreso! Ya eres un Constructor.',
      'Estás muy cerca del círculo interno. ¡Sigue adelante!',
      'Tu compromiso con DFORZZE es notable. ¡Casi lo logras!'
    ],
    'INNER': [
      '¡Felicitaciones! Eres parte del Círculo Interno.',
      'Has alcanzado el máximo nivel de membresía.',
      'Disfruta de todos los beneficios exclusivos de DFORZZE.'
    ]
  },
  
  // 7.2: Estimaciones de tiempo para próximo rango
  getProgressEstimate: function(user) {
    if (!user || user.rank === 'INNER') {
      return {
        message: 'Has alcanzado el máximo rango',
        stickersNeeded: 0,
        estimatedDays: 0
      };
    }
    
    const currentStickers = user.stickerCount || 0;
    const curIdx = RANK_ORDER.indexOf(user.rank || 'NONE');
    const nextRank = RANK_ORDER[Math.min(curIdx + 1, RANK_ORDER.length - 1)];
    const nextRankData = RANKS[nextRank];
    const stickersNeeded = Math.max(0, nextRankData.stk - currentStickers);
    
    // Estimación: asumiendo 1 sticker cada 3 días en promedio
    const estimatedDays = stickersNeeded * 3;
    
    let timeEstimate = '';
    if (estimatedDays === 0) {
      timeEstimate = 'Muy pronto';
    } else if (estimatedDays <= 7) {
      timeEstimate = 'Esta semana';
    } else if (estimatedDays <= 14) {
      timeEstimate = 'Próximas 2 semanas';
    } else if (estimatedDays <= 30) {
      timeEstimate = 'Este mes';
    } else {
      timeEstimate = Math.ceil(estimatedDays / 30) + ' meses';
    }
    
    return {
      message: `Necesitas ${stickersNeeded} sticker${stickersNeeded !== 1 ? 's' : ''} más para alcanzar ${nextRankData.l}`,
      stickersNeeded: stickersNeeded,
      estimatedDays: estimatedDays,
      timeEstimate: timeEstimate,
      nextRank: nextRankData.l
    };
  },
  
  // 7.2: Sugerencias de acciones para ganar más stickers
  getActionSuggestions: function(user) {
    const suggestions = [];
    
    if (!user || !user.stickerCount || user.stickerCount === 0) {
      suggestions.push({
        icon: '◆',
        title: 'Canjea tu primer sticker',
        description: 'Busca un código de sticker y canjéalo para comenzar',
        action: 'Canjear código'
      });
    }
    
    if (user.rank !== 'INITIATED' && (user.stickerCount || 0) < 3) {
      suggestions.push({
        icon: '▲',
        title: 'Alcanza el rango Initiated',
        description: `Necesitas ${3 - (user.stickerCount || 0)} sticker${3 - (user.stickerCount || 0) !== 1 ? 's' : ''} más`,
        action: 'Canjear más códigos'
      });
    }
    
    if (user.rank !== 'BUILDER' && (user.stickerCount || 0) < 7) {
      suggestions.push({
        icon: '■',
        title: 'Sube al rango Builder',
        description: `Necesitas ${7 - (user.stickerCount || 0)} sticker${7 - (user.stickerCount || 0) !== 1 ? 's' : ''} más`,
        action: 'Continúa canjeando'
      });
    }
    
    if (user.rank !== 'INNER' && (user.stickerCount || 0) < 15) {
      suggestions.push({
        icon: '●',
        title: 'Únete al Círculo Interno',
        description: `Necesitas ${15 - (user.stickerCount || 0)} sticker${15 - (user.stickerCount || 0) !== 1 ? 's' : ''} más`,
        action: 'Sigue adelante'
      });
    }
    
    return suggestions;
  },
  
  // 7.2: Renderizar panel motivacional
  renderMotivationalPanel: function(user) {
    if (!user) return '';
    
    const message = this.motivationalMessages[user.rank || 'NONE'][
      Math.floor(Math.random() * this.motivationalMessages[user.rank || 'NONE'].length)
    ];
    
    const estimate = this.getProgressEstimate(user);
    const suggestions = this.getActionSuggestions(user);
    
    let html = `
      <div class="motivational-panel" style="
        background: linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02));
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        border: 1px solid rgba(0,0,0,0.1);
      ">
        <!-- Mensaje motivacional -->
        <div style="
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        ">
          <p style="
            font-size: 14px;
            font-weight: 600;
            color: #000;
            margin: 0;
            line-height: 1.5;
          ">${message}</p>
        </div>
        
        <!-- Estimación de progreso -->
        <div style="
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        ">
          <div style="
            font-size: 12px;
            font-weight: 700;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
          ">Próximo Rango</div>
          <div style="
            font-size: 14px;
            font-weight: 600;
            color: #000;
            margin-bottom: 8px;
          ">${estimate.message}</div>
          <div style="
            font-size: 12px;
            color: #6c757d;
          ">Estimado: ${estimate.timeEstimate}</div>
        </div>
        
        <!-- Sugerencias de acciones -->
        <div>
          <div style="
            font-size: 12px;
            font-weight: 700;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
          ">Próximos Pasos</div>
          <div style="
            display: flex;
            flex-direction: column;
            gap: 8px;
          ">
    `;
    
    suggestions.slice(0, 2).forEach(suggestion => {
      html += `
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.1);
        ">
          <div style="
            font-size: 20px;
            flex-shrink: 0;
          ">${suggestion.icon}</div>
          <div style="flex: 1;">
            <div style="
              font-weight: 600;
              font-size: 12px;
              color: #000;
              margin-bottom: 2px;
            ">${suggestion.title}</div>
            <div style="
              font-size: 11px;
              color: #6c757d;
            ">${suggestion.description}</div>
          </div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    return html;
  }
};


// ===== 7.3: SISTEMA DE ONBOARDING MEJORADO =====
const OnboardingSystem = {
  // 7.3: Tour interactivo del sistema de stickers
  steps: [
    {
      id: 'welcome',
      title: '¡Bienvenido a DFORZZE!',
      content: 'Descubre cómo funciona nuestro sistema de membresía con stickers y rangos exclusivos.',
      icon: '◆',
      tips: [
        'Tu membresía es progresiva',
        'Cada sticker te acerca a nuevos beneficios',
        'Disfruta de una experiencia premium'
      ]
    },
    {
      id: 'stickers',
      title: 'Gana Stickers',
      content: 'Canjea códigos de stickers para sumar puntos y subir de rango en la comunidad DFORZZE.',
      icon: '✦',
      tips: [
        'Cada código = 1 sticker',
        'Los stickers se acumulan en tu perfil',
        'Busca códigos en eventos especiales'
      ]
    },
    {
      id: 'progress',
      title: 'Sigue tu Progreso',
      content: 'Observa tu avance hacia el siguiente rango con nuestra barra de progreso visual interactiva.',
      icon: '▲',
      tips: [
        'Visualiza tu progreso en tiempo real',
        'Conoce cuántos stickers necesitas',
        'Recibe estimaciones de tiempo'
      ]
    },
    {
      id: 'ranks',
      title: 'Sube de Rango',
      content: 'Desde Sin Rango hasta Inner Circle. Cada rango desbloquea nuevos beneficios exclusivos.',
      icon: '●',
      tips: [
        'Sin Rango → Initiated (3 stickers)',
        'Initiated → Builder (7 stickers)',
        'Builder → Inner (15 stickers)'
      ]
    },
    {
      id: 'achievements',
      title: 'Desbloquea Logros',
      content: 'Gana badges y logros especiales mientras avanzas en tu membresía.',
      icon: '⬢',
      tips: [
        'Logros por cada rango alcanzado',
        'Hitos especiales por stickers',
        'Colecciona todos los badges'
      ]
    }
  ],
  
  currentStep: 0,
  
  // 7.3: Crear tour interactivo
  startOnboarding: function() {
    if (!U || U.preferences.tutorialCompleted) return;
    
    this.currentStep = 0;
    this.showStep(this.steps[0]);
  },
  
  // 7.3: Mostrar explicaciones paso a paso
  showStep: function(step) {
    try {
      const overlay = document.createElement('div');
      overlay.id = 'onboardingOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(4px);
        z-index: 1003;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #fff;
        border-radius: 16px;
        padding: 32px;
        max-width: 450px;
        width: 90%;
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      `;
      
      // Renderizar tips contextuales
      let tipsHtml = '';
      if (step.tips && step.tips.length > 0) {
        tipsHtml = `
          <div style="
            background: rgba(0,0,0,0.05);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            text-align: left;
          ">
            <div style="
              font-size: 11px;
              font-weight: 700;
              color: #6c757d;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 8px;
            ">Tips Útiles</div>
            <ul style="
              margin: 0;
              padding-left: 20px;
              list-style: none;
            ">
        `;
        
        step.tips.forEach(tip => {
          tipsHtml += `
            <li style="
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 6px;
              position: relative;
              padding-left: 12px;
            ">
              <span style="
                position: absolute;
                left: 0;
                color: #000;
              ">◆</span>
              ${tip}
            </li>
          `;
        });
        
        tipsHtml += `
            </ul>
          </div>
        `;
      }
      
      modal.innerHTML = `
        <div style="font-size: 56px; margin-bottom: 16px; animation: bounce 0.6s ease;">${step.icon}</div>
        <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #000;">${step.title}</h3>
        <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">${step.content}</p>
        ${tipsHtml}
        <div style="
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        ">
          <button onclick="OnboardingSystem.skipOnboarding()" style="
            background: rgba(0,0,0,0.1);
            color: #000;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(0,0,0,0.15)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'">Saltar</button>
          <button onclick="OnboardingSystem.nextStep()" style="
            background: #000;
            color: #fff;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#000'">${this.currentStep === this.steps.length - 1 ? 'Finalizar' : 'Siguiente'}</button>
        </div>
        <div style="
          margin-top: 16px;
          font-size: 12px;
          color: #6c757d;
        ">Paso ${this.currentStep + 1} de ${this.steps.length}</div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      }, 100);
      
    } catch (error) {
      ErrorHandler.handleRenderError(error, 'onboarding');
    }
  },
  
  nextStep: function() {
    this.closeCurrentStep();
    
    this.currentStep++;
    
    if (this.currentStep >= this.steps.length) {
      this.completeOnboarding();
    } else {
      setTimeout(() => {
        this.showStep(this.steps[this.currentStep]);
      }, 300);
    }
  },
  
  skipOnboarding: function() {
    this.closeCurrentStep();
    this.completeOnboarding();
  },
  
  closeCurrentStep: function() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      }, 300);
    }
  },
  
  completeOnboarding: function() {
    if (U) {
      U.preferences.tutorialCompleted = true;
      try {
        localStorage.setItem('dforzze_user', JSON.stringify(U));
        syncUserList();
      } catch (error) {
        ErrorHandler.handleStorageError(error, 'complete_onboarding');
      }
    }
    
    ErrorHandler.showUserNotification('¡Bienvenido a DFORZZE! Ya puedes comenzar a canjear stickers.', 'success');
  },
  
  // 7.3: Mostrar tips contextuales durante primeras interacciones
  showContextualTip: function(context) {
    const tips = {
      'first_visit': {
        title: 'Bienvenido a DFORZZE',
        message: 'Canjea códigos para ganar stickers y subir de rango',
        icon: '◆'
      },
      'first_redemption': {
        title: 'Primer Sticker',
        message: '¡Excelente! Acabas de ganar tu primer sticker',
        icon: '✦'
      },
      'rank_up': {
        title: 'Nuevo Rango',
        message: 'Felicitaciones por alcanzar un nuevo rango',
        icon: '▲'
      },
      'achievement_unlocked': {
        title: 'Logro Desbloqueado',
        message: 'Has desbloqueado un nuevo logro',
        icon: '⬢'
      }
    };
    
    const tip = tips[context];
    if (!tip) return;
    
    try {
      const notification = document.createElement('div');
      notification.className = 'contextual-tip';
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1002;
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        max-width: 300px;
        border-left: 4px solid #000;
        transform: translateX(-400px);
        transition: transform 0.4s ease;
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 24px; flex-shrink: 0;">${tip.icon}</div>
          <div>
            <div style="font-weight: 700; font-size: 13px; color: #000; margin-bottom: 4px;">${tip.title}</div>
            <div style="font-size: 12px; color: #6c757d;">${tip.message}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      setTimeout(() => {
        notification.style.transform = 'translateX(-400px)';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 400);
      }, 5000);
      
    } catch (error) {
      ErrorHandler.handleAnimationError(error);
    }
  }
};

// ===== SISTEMA DE COLECCIÓN DE STICKERS VISUALES =====
const StickerCollectionSystem = {
  // Iconos minimalist Nike-style
  stickerIcons: {
    standard: '◆',
    special: '⬢',
    event: '✦',
    rare: '■',
    epic: '▲',
    legendary: '●'
  },
  
  renderStickerCollection: function(user) {
    if (!user || !user.stickers) return '';
    
    const stickers = user.stickers || [];
    
    if (stickers.length === 0) {
      return this.renderEmptyState();
    }
    
    let html = `
      <div class="stickers-grid" style="padding: 20px;">
        <div class="stickers-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        ">
          <h3 style="
            font-size: 16px;
            font-weight: 700;
            color: #000;
            margin: 0;
          ">Mi Colección de Stickers</h3>
          <div class="stickers-count" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px 20px;
            background: linear-gradient(135deg, #000, #333);
            border-radius: 8px;
            color: white;
          ">
            <span class="count-number" style="
              font-size: 24px;
              font-weight: 800;
              line-height: 1;
            ">${stickers.length}</span>
            <span class="count-label" style="
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              opacity: 0.7;
              margin-top: 4px;
            ">stickers</span>
          </div>
        </div>
        
        <div class="stickers-showcase" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
          min-height: 120px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #dee2e6;
        ">
    `;
    
    stickers.forEach((sticker, index) => {
      const icon = this.stickerIcons[sticker.type || 'standard'] || '◆';
      const date = sticker.date || 'N/A';
      
      html += `
        <div class="sticker-item" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
          cursor: pointer;
          position: relative;
        " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" title="${sticker.name || 'Sticker'} - ${date}">
          <div class="sticker-icon" style="
            font-size: 32px;
            margin-bottom: 8px;
          ">${icon}</div>
          <span class="sticker-date" style="
            font-size: 9px;
            color: #6c757d;
            text-align: center;
          ">${date}</span>
        </div>
      `;
    });
    
    html += `
        </div>
        
        <div class="stickers-timeline" style="
          border-top: 1px solid #e9ecef;
          padding-top: 20px;
        ">
          <h4 style="
            font-size: 13px;
            font-weight: 700;
            color: #000;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">Historial Reciente</h4>
          <div class="timeline-items" style="
            display: flex;
            flex-direction: column;
            gap: 12px;
          ">
    `;
    
    // Mostrar últimos 5 stickers en el timeline
    const recentStickers = stickers.slice(-5).reverse();
    recentStickers.forEach((sticker, index) => {
      const icon = this.stickerIcons[sticker.type || 'standard'] || '◆';
      const date = sticker.date || 'N/A';
      
      html += `
        <div class="timeline-item" style="
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 3px solid #000;
        ">
          <div style="
            font-size: 20px;
            flex-shrink: 0;
          ">${icon}</div>
          <div style="flex: 1;">
            <p style="
              font-size: 12px;
              font-weight: 600;
              color: #000;
              margin: 0 0 2px 0;
            ">${sticker.name || 'Sticker'}</p>
            <p style="
              font-size: 11px;
              color: #6c757d;
              margin: 0;
            ">${date}</p>
          </div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    return html;
  },
  
  renderEmptyState: function() {
    return `
      <div class="empty-stickers" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #6c757d;
        padding: 20px;
        text-align: center;
      ">
        <div class="empty-icon" style="
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.3;
        ">◆</div>
        <p style="
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #000;
        ">Aún no tienes stickers</p>
        <p style="
          font-size: 12px;
          color: #6c757d;
          margin: 0;
          max-width: 300px;
        ">Canjea códigos para comenzar a construir tu colección y subir de rango en DFORZZE.</p>
      </div>
    `;
  },
  
  renderTooltips: function() {
    const tooltips = {
      'Sin Rango': 'Punto de partida. Canjea 3 stickers para alcanzar Initiated.',
      'Initiated': 'Primer rango. Acceso a comunidad exclusiva. Necesitas 7 stickers para Builder.',
      'Builder': 'Rango intermedio. Beneficios premium. Necesitas 15 stickers para Inner.',
      'Inner': 'Círculo interno. Máximo rango con todos los beneficios exclusivos.'
    };
    
    let html = '<div class="tooltips-container" style="display: none;">';
    
    for (const [rank, description] of Object.entries(tooltips)) {
      html += `
        <div class="tooltip" data-rank="${rank}" style="
          position: absolute;
          background: #000;
          color: #fff;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 1000;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        ">
          ${description}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  },
  
  attachTooltipListeners: function() {
    try {
      const milestones = document.querySelectorAll('.rank-milestone');
      
      milestones.forEach(milestone => {
        const rankKey = milestone.getAttribute('data-rank');
        const rankData = RANKS[rankKey];
        
        if (!rankData) return;
        
        const label = milestone.querySelector('.milestone-label');
        if (label) {
          label.style.cursor = 'help';
          label.title = this.getTooltipText(rankKey);
          
          label.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'rank-tooltip';
            tooltip.style.cssText = `
              position: absolute;
              background: #000;
              color: #fff;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 11px;
              white-space: nowrap;
              z-index: 1000;
              pointer-events: none;
              bottom: 100%;
              left: 50%;
              transform: translateX(-50%);
              margin-bottom: 8px;
            `;
            tooltip.textContent = this.getTooltipText(rankKey);
            
            milestone.style.position = 'relative';
            milestone.appendChild(tooltip);
            
            setTimeout(() => {
              tooltip.style.opacity = '1';
            }, 10);
          });
          
          label.addEventListener('mouseleave', () => {
            const tooltip = milestone.querySelector('.rank-tooltip');
            if (tooltip) {
              tooltip.remove();
            }
          });
        }
      });
    } catch (error) {
      ErrorHandler.handleAnimationError(error);
    }
  },
  
  getTooltipText: function(rankKey) {
    const tooltips = {
      'NONE': 'Sin Rango - Punto de partida. Canjea 3 stickers para Initiated.',
      'INITIATED': 'Initiated - Acceso a comunidad. Necesitas 7 stickers para Builder.',
      'BUILDER': 'Builder - Beneficios premium. Necesitas 15 stickers para Inner.',
      'INNER': 'Inner - Círculo interno. Máximo rango con todos los beneficios.'
    };
    
    return tooltips[rankKey] || 'Rango DFORZZE';
  }
};

// ===== 6.1 & 6.3 & 6.4: SISTEMA DE CANJE MEJORADO =====
const RedemptionSystem = {
  // 6.3: Validación mejorada de códigos con reglas específicas
  validateCodeFormat: function(code) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Código inválido' };
    }
    
    const trimmedCode = code.trim().toUpperCase();
    
    // Regla: [A-Z0-9-]{6,20}
    if (trimmedCode.length < 6 || trimmedCode.length > 20) {
      return { valid: false, error: 'El código debe tener entre 6 y 20 caracteres' };
    }
    
    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      return { valid: false, error: 'Solo se permiten letras mayúsculas, números y guiones' };
    }
    
    return { valid: true, code: trimmedCode };
  },
  
  // 6.3: Prevención de códigos duplicados
  checkDuplicateCode: function(user, code) {
    if (!user || !user.stickers) return { isDuplicate: false };
    
    const isDuplicate = user.stickers.some(sticker => 
      sticker.code && sticker.code.toUpperCase() === code.toUpperCase()
    );
    
    return { 
      isDuplicate: isDuplicate,
      error: isDuplicate ? 'Ya has canjeado este código anteriormente' : null
    };
  },
  
  // 6.1: Modal de canje rediseñado con mejor UX
  showRedemptionModal: function() {
    try {
      const overlay = document.createElement('div');
      overlay.id = 'redemptionModalOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      
      const modal = document.createElement('div');
      modal.id = 'redemptionModal';
      modal.style.cssText = `
        background: #fff;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        transform: scale(0.95);
        transition: transform 0.3s ease;
        position: relative;
      `;
      
      modal.innerHTML = `
        <!-- Header explicativo -->
        <div class="redeem-header" style="
          margin-bottom: 24px;
          text-align: center;
        ">
          <button onclick="RedemptionSystem.closeRedemptionModal()" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: rgba(0,0,0,0.3);
            transition: color 0.2s ease;
          " onmouseover="this.style.color='rgba(0,0,0,0.6)'" onmouseout="this.style.color='rgba(0,0,0,0.3)'">×</button>
          
          <h3 style="
            font-size: 24px;
            font-weight: 700;
            color: #000;
            margin: 0 0 8px 0;
          ">Canjear Código</h3>
          <p style="
            font-size: 14px;
            color: #6c757d;
            margin: 0;
            line-height: 1.5;
          ">Ingresa tu código para añadir stickers a tu colección</p>
        </div>
        
        <!-- Input mejorado con validación en tiempo real -->
        <div class="code-input-container" style="
          margin-bottom: 24px;
        ">
          <input 
            type="text" 
            id="codeInput" 
            placeholder="DFZ-XXXXXX" 
            maxlength="20"
            style="
              width: 100%;
              background: rgba(0,0,0,0.05);
              border: 2px solid rgba(0,0,0,0.1);
              border-radius: 8px;
              padding: 12px 16px;
              font-size: 14px;
              font-weight: 600;
              color: #000;
              outline: none;
              transition: all 0.2s ease;
              text-transform: uppercase;
            "
            oninput="RedemptionSystem.validateCodeInput(this)"
            onkeypress="if(event.key==='Enter') RedemptionSystem.submitRedemption()"
          >
          <div id="inputStatus" style="
            margin-top: 8px;
            font-size: 12px;
            color: #6c757d;
            min-height: 16px;
          "></div>
        </div>
        
        <!-- Sección informativa sobre beneficios -->
        <div class="redeem-info" style="
          background: rgba(0,0,0,0.03);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          border-left: 3px solid #000;
        ">
          <div class="info-item" style="
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
          ">
            <span style="
              font-size: 16px;
              flex-shrink: 0;
            ">◆</span>
            <div>
              <p style="
                font-size: 12px;
                font-weight: 600;
                color: #000;
                margin: 0 0 2px 0;
              ">+1 Sticker</p>
              <p style="
                font-size: 11px;
                color: #6c757d;
                margin: 0;
              ">Cada código te da un sticker</p>
            </div>
          </div>
          <div class="info-item" style="
            display: flex;
            align-items: flex-start;
            gap: 12px;
          ">
            <span style="
              font-size: 16px;
              flex-shrink: 0;
            ">▲</span>
            <div>
              <p style="
                font-size: 12px;
                font-weight: 600;
                color: #000;
                margin: 0 0 2px 0;
              ">Sube de Rango</p>
              <p style="
                font-size: 11px;
                color: #6c757d;
                margin: 0;
              ">Los stickers te ayudan a alcanzar nuevos rangos</p>
            </div>
          </div>
        </div>
        
        <!-- Botón de canje con estado de carga -->
        <button 
          id="redeemButton"
          onclick="RedemptionSystem.submitRedemption()" 
          style="
            width: 100%;
            background: #000;
            color: #fff;
            border: none;
            padding: 14px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          "
          onmouseover="this.style.background='#333'"
          onmouseout="this.style.background='#000'"
        >
          <span id="buttonText">Canjear Código</span>
          <span id="buttonLoader" style="
            display: none;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></span>
        </button>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Animación de entrada
      setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      }, 50);
      
      // Focus en input
      setTimeout(() => {
        document.getElementById('codeInput').focus();
      }, 300);
      
    } catch (error) {
      ErrorHandler.handleRenderError(error, 'redemption_modal');
    }
  },
  
  // 6.1: Validación en tiempo real del input
  validateCodeInput: function(input) {
    const code = input.value.trim().toUpperCase();
    const statusEl = document.getElementById('inputStatus');
    
    if (!statusEl) return;
    
    if (!code) {
      statusEl.textContent = '';
      statusEl.style.color = '#6c757d';
      return;
    }
    
    // Validar formato
    const formatValidation = this.validateCodeFormat(code);
    
    if (!formatValidation.valid) {
      statusEl.textContent = formatValidation.error;
      statusEl.style.color = '#ef4444';
      return;
    }
    
    // Validar duplicados
    if (U) {
      const duplicateCheck = this.checkDuplicateCode(U, code);
      if (duplicateCheck.isDuplicate) {
        statusEl.textContent = duplicateCheck.error;
        statusEl.style.color = '#f59e0b';
        return;
      }
    }
    
    statusEl.textContent = '✓ Código válido';
    statusEl.style.color = '#10b981';
  },
  
  // 6.4: Estados de carga y feedback visual
  submitRedemption: function() {
    const codeInput = document.getElementById('codeInput');
    const redeemButton = document.getElementById('redeemButton');
    const buttonText = document.getElementById('buttonText');
    const buttonLoader = document.getElementById('buttonLoader');
    
    if (!codeInput || !redeemButton) return;
    
    const code = codeInput.value.trim().toUpperCase();
    
    // Validar formato
    const formatValidation = this.validateCodeFormat(code);
    if (!formatValidation.valid) {
      NotificationSystem.error(formatValidation.error);
      return;
    }
    
    // Validar duplicados
    if (U) {
      const duplicateCheck = this.checkDuplicateCode(U, code);
      if (duplicateCheck.isDuplicate) {
        NotificationSystem.warning(duplicateCheck.error);
        return;
      }
    }
    
    // Mostrar estado de carga
    redeemButton.disabled = true;
    buttonText.style.display = 'none';
    buttonLoader.style.display = 'block';
    
    // Simular procesamiento (en producción sería una llamada a servidor)
    setTimeout(() => {
      try {
        // Aquí iría la lógica de canje real
        // Por ahora simulamos éxito
        const success = true;
        
        if (success) {
          // Mostrar éxito
          buttonText.textContent = '✓ ¡Canjeado!';
          buttonText.style.display = 'block';
          buttonLoader.style.display = 'none';
          redeemButton.style.background = '#10b981';
          
          // Cerrar modal después de 1.5 segundos
          setTimeout(() => {
            this.closeRedemptionModal();
            NotificationSystem.success('¡Sticker canjeado exitosamente!');
            
            // Actualizar progreso
            if (U) {
              U.stickerCount = (U.stickerCount || 0) + 1;
              U.stickers = U.stickers || [];
              U.stickers.push({
                name: 'Sticker',
                code: code,
                date: new Date().toLocaleDateString('es-ES'),
                type: 'standard'
              });
              
              try {
                localStorage.setItem('dforzze_user', JSON.stringify(U));
                syncUserList();
              } catch (error) {
                ErrorHandler.handleStorageError(error, 'redeem_code');
              }
              
              // Mostrar animación de celebración
              AnimationSystem.showStickerRedemptionAnimation({ icon: '◆' });
              
              // Actualizar progreso visual
              ProgressSystem.updateProgressWithAnimation();
              
              // Verificar logros
              AchievementSystem.checkAndUnlockAchievements(U);
            }
          }, 1500);
        } else {
          // Mostrar error
          buttonText.textContent = 'Error al canjear';
          buttonText.style.display = 'block';
          buttonLoader.style.display = 'none';
          redeemButton.style.background = '#ef4444';
          redeemButton.disabled = false;
          
          NotificationSystem.error('No se pudo canjear el código. Intenta de nuevo.');
        }
      } catch (error) {
        ErrorHandler.handleAnimationError(error, () => {
          buttonText.textContent = 'Canjear Código';
          buttonText.style.display = 'block';
          buttonLoader.style.display = 'none';
          redeemButton.style.background = '#000';
          redeemButton.disabled = false;
          NotificationSystem.error('Error al procesar el canje');
        });
      }
    }, 1200);
  },
  
  closeRedemptionModal: function() {
    const overlay = document.getElementById('redemptionModalOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
      }, 300);
    }
  }
};

// ===== EXPORTAR PARA USO GLOBAL =====
if (typeof window !== 'undefined') {
  window.SystemConfig = SystemConfig;
  window.DataValidator = DataValidator;
  window.ErrorHandler = ErrorHandler;
  window.ProgressSystem = ProgressSystem;
  window.AnimationSystem = AnimationSystem;
  window.NotificationSystem = NotificationSystem;
  window.AchievementSystem = AchievementSystem;
  window.MotivationalSystem = MotivationalSystem;
  window.OnboardingSystem = OnboardingSystem;
  window.StickerCollectionSystem = StickerCollectionSystem;
  window.RedemptionSystem = RedemptionSystem;
}
