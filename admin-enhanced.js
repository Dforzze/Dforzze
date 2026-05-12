/**
 * PANEL ADMINISTRATIVO MEJORADO - DFORZZE
 * Funcionalidades avanzadas para gestión de stickers, analytics y auditoría
 * Task 9: Mejorar Panel Administrativo
 */

// ===== SISTEMA DE ANALYTICS MEJORADO =====
const AdminAnalytics = {
  calculateMetrics: function(users) {
    if (!users || users.length === 0) {
      return {
        totalUsers: 0,
        totalStickers: 0,
        avgStickers: 0,
        rankDistribution: {
          'NONE': 0,
          'INITIATED': 0,
          'BUILDER': 0,
          'INNER': 0
        },
        topUsers: [],
        recentActivity: [],
        engagementMetrics: {
          activeUsers: 0,
          inactiveUsers: 0,
          avgStickersPerRank: {}
        }
      };
    }
    
    const totalUsers = users.length;
    const totalStickers = users.reduce((sum, user) => sum + (user.stickerCount || 0), 0);
    const avgStickers = totalUsers > 0 ? totalStickers / totalUsers : 0;
    
    // Distribución por rangos
    const rankDistribution = {
      'NONE': users.filter(u => u.rank === 'NONE' || !u.rank).length,
      'INITIATED': users.filter(u => u.rank === 'INITIATED').length,
      'BUILDER': users.filter(u => u.rank === 'BUILDER').length,
      'INNER': users.filter(u => u.rank === 'INNER').length
    };
    
    // Promedio de stickers por rango
    const avgStickersPerRank = {};
    Object.keys(rankDistribution).forEach(rank => {
      const rankUsers = users.filter(u => (u.rank || 'NONE') === rank);
      const rankStickers = rankUsers.reduce((sum, u) => sum + (u.stickerCount || 0), 0);
      avgStickersPerRank[rank] = rankUsers.length > 0 ? (rankStickers / rankUsers.length).toFixed(2) : 0;
    });
    
    // Top usuarios
    const topUsers = users
      .sort((a, b) => (b.stickerCount || 0) - (a.stickerCount || 0))
      .slice(0, 10)
      .map(u => ({
        name: u.name,
        email: u.email,
        stickers: u.stickerCount || 0,
        rank: u.rank || 'NONE'
      }));
    
    // Actividad reciente
    const recentActivity = users
      .filter(u => u.lastActivity)
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 10)
      .map(u => ({
        name: u.name,
        email: u.email,
        activity: u.lastActivity,
        stickers: u.stickerCount || 0,
        rank: u.rank || 'NONE'
      }));
    
    // Métricas de engagement
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const activeUsers = users.filter(u => {
      if (!u.lastActivity) return false;
      return new Date(u.lastActivity) > thirtyDaysAgo;
    }).length;
    
    const inactiveUsers = totalUsers - activeUsers;
    
    return {
      totalUsers,
      totalStickers,
      avgStickers: avgStickers.toFixed(2),
      rankDistribution,
      topUsers,
      recentActivity,
      engagementMetrics: {
        activeUsers,
        inactiveUsers,
        avgStickersPerRank,
        engagementRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0
      }
    };
  },
  
  generateReport: function(users) {
    const metrics = this.calculateMetrics(users);
    
    const mostCommonRank = Object.keys(metrics.rankDistribution).reduce((a, b) => 
      metrics.rankDistribution[a] > metrics.rankDistribution[b] ? a : b
    );
    
    return {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      summary: {
        description: `Reporte de ${metrics.totalUsers} usuarios con ${metrics.totalStickers} stickers totales`,
        avgPerUser: metrics.avgStickers,
        mostCommonRank: mostCommonRank,
        engagementRate: metrics.engagementMetrics.engagementRate + '%'
      }
    };
  },
  
  getDistributionByRange: function(users) {
    if (!users || users.length === 0) {
      return {
        'NONE': { count: 0, percentage: 0 },
        'INITIATED': { count: 0, percentage: 0 },
        'BUILDER': { count: 0, percentage: 0 },
        'INNER': { count: 0, percentage: 0 }
      };
    }
    
    const distribution = {
      'NONE': users.filter(u => u.rank === 'NONE' || !u.rank).length,
      'INITIATED': users.filter(u => u.rank === 'INITIATED').length,
      'BUILDER': users.filter(u => u.rank === 'BUILDER').length,
      'INNER': users.filter(u => u.rank === 'INNER').length
    };
    
    const total = users.length;
    const result = {};
    
    Object.keys(distribution).forEach(rank => {
      result[rank] = {
        count: distribution[rank],
        percentage: total > 0 ? ((distribution[rank] / total) * 100).toFixed(2) : 0
      };
    });
    
    return result;
  },
  
  getRedemptionPatterns: function(users) {
    if (!users || users.length === 0) {
      return {
        totalRedemptions: 0,
        averageRedemptionsPerUser: 0,
        redemptionTrend: []
      };
    }
    
    const totalRedemptions = users.reduce((sum, user) => {
      return sum + (user.stickers ? user.stickers.length : 0);
    }, 0);
    
    const averageRedemptionsPerUser = users.length > 0 ? (totalRedemptions / users.length).toFixed(2) : 0;
    
    return {
      totalRedemptions,
      averageRedemptionsPerUser,
      redemptionTrend: this.calculateRedemptionTrend(users)
    };
  },
  
  calculateRedemptionTrend: function(users) {
    const trend = {};
    
    users.forEach(user => {
      if (user.stickers && Array.isArray(user.stickers)) {
        user.stickers.forEach(sticker => {
          const date = sticker.date ? sticker.date.split('T')[0] : new Date().toISOString().split('T')[0];
          trend[date] = (trend[date] || 0) + 1;
        });
      }
    });
    
    return Object.entries(trend)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));
  }
};

// ===== SISTEMA DE GESTIÓN MASIVA =====
const AdminBulkOperations = {
  addStickersToUsers: function(userEmails, stickerCount) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let updated = 0;
      const changes = [];
      
      userEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          const oldRank = user.rank || 'NONE';
          const oldStickers = user.stickerCount || 0;
          
          user.stickerCount = (user.stickerCount || 0) + stickerCount;
          
          // Actualizar rango
          if (user.stickerCount >= 15) user.rank = 'INNER';
          else if (user.stickerCount >= 7) user.rank = 'BUILDER';
          else if (user.stickerCount >= 3) user.rank = 'INITIATED';
          else user.rank = 'NONE';
          
          user.lastActivity = new Date().toISOString();
          
          changes.push({
            email: email,
            oldStickers: oldStickers,
            newStickers: user.stickerCount,
            oldRank: oldRank,
            newRank: user.rank
          });
          
          updated++;
        }
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      // Registrar en auditoría
      AdminAuditTrail.log('BULK_ADD_STICKERS', {
        count: stickerCount,
        usersAffected: updated,
        changes: changes
      });
      
      return {
        success: true,
        updated: updated,
        changes: changes,
        message: `${updated} usuarios actualizados`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  removeStickersFromUsers: function(userEmails, stickerCount) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let updated = 0;
      const changes = [];
      
      userEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          const oldRank = user.rank || 'NONE';
          const oldStickers = user.stickerCount || 0;
          
          user.stickerCount = Math.max((user.stickerCount || 0) - stickerCount, 0);
          
          // Actualizar rango
          if (user.stickerCount >= 15) user.rank = 'INNER';
          else if (user.stickerCount >= 7) user.rank = 'BUILDER';
          else if (user.stickerCount >= 3) user.rank = 'INITIATED';
          else user.rank = 'NONE';
          
          user.lastActivity = new Date().toISOString();
          
          changes.push({
            email: email,
            oldStickers: oldStickers,
            newStickers: user.stickerCount,
            oldRank: oldRank,
            newRank: user.rank
          });
          
          updated++;
        }
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      // Registrar en auditoría
      AdminAuditTrail.log('BULK_REMOVE_STICKERS', {
        count: stickerCount,
        usersAffected: updated,
        changes: changes
      });
      
      return {
        success: true,
        updated: updated,
        changes: changes,
        message: `${updated} usuarios actualizados`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  blockUsers: function(userEmails) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let blocked = 0;
      const changes = [];
      
      userEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          user.blocked = true;
          user.lastActivity = new Date().toISOString();
          changes.push({ email: email, action: 'blocked' });
          blocked++;
        }
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      // Registrar en auditoría
      AdminAuditTrail.log('BULK_BLOCK_USERS', {
        usersAffected: blocked,
        changes: changes
      });
      
      return {
        success: true,
        blocked: blocked,
        changes: changes,
        message: `${blocked} usuarios bloqueados`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  unblockUsers: function(userEmails) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let unblocked = 0;
      const changes = [];
      
      userEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          user.blocked = false;
          user.lastActivity = new Date().toISOString();
          changes.push({ email: email, action: 'unblocked' });
          unblocked++;
        }
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      // Registrar en auditoría
      AdminAuditTrail.log('BULK_UNBLOCK_USERS', {
        usersAffected: unblocked,
        changes: changes
      });
      
      return {
        success: true,
        unblocked: unblocked,
        changes: changes,
        message: `${unblocked} usuarios desbloqueados`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  exportUsers: function(format = 'json') {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      
      if (format === 'csv') {
        return this.convertUsersToCSV(users);
      }
      
      return JSON.stringify(users, null, 2);
    } catch (error) {
      return null;
    }
  },
  
  convertUsersToCSV: function(users) {
    if (!users || users.length === 0) return '';
    
    const headers = ['Name', 'Email', 'Rank', 'Stickers', 'Blocked', 'Created', 'Last Activity'];
    const rows = users.map(user => [
      user.name || '',
      user.email || '',
      user.rank || 'NONE',
      user.stickerCount || 0,
      user.blocked ? 'Yes' : 'No',
      user.createdAt || '',
      user.lastActivity || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
  }
};

// ===== SISTEMA DE AUDITORÍA COMPLETO =====
const AdminAuditTrail = {
  log: function(action, details) {
    try {
      const auditLog = JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]');
      
      const entry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        admin: localStorage.getItem('dforzze_admin_email') || 'unknown',
        severity: this.determineSeverity(action)
      };
      
      auditLog.push(entry);
      
      // Mantener solo los últimos 5000 registros
      if (auditLog.length > 5000) {
        auditLog.shift();
      }
      
      localStorage.setItem('dforzze_audit_log', JSON.stringify(auditLog));
      
      // Detectar actividad sospechosa
      this.checkSuspiciousActivity(entry);
      
      return true;
    } catch (error) {
      console.error('Error logging audit trail:', error);
      return false;
    }
  },
  
  determineSeverity: function(action) {
    const severityMap = {
      'BULK_ADD_STICKERS': 'medium',
      'BULK_REMOVE_STICKERS': 'medium',
      'BULK_BLOCK_USERS': 'high',
      'BULK_UNBLOCK_USERS': 'medium',
      'SPECIAL_EVENT': 'medium',
      'DATA_IMPORT': 'high',
      'BACKUP_CREATED': 'low',
      'BACKUP_RESTORED': 'high',
      'USER_EDIT': 'medium',
      'CODE_GENERATED': 'low',
      'CODE_REDEEMED': 'low'
    };
    
    return severityMap[action] || 'low';
  },
  
  checkSuspiciousActivity: function(entry) {
    try {
      const auditLog = JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]');
      const alerts = JSON.parse(localStorage.getItem('dforzze_security_alerts') || '[]');
      
      // Detectar múltiples operaciones en corto tiempo
      const recentEntries = auditLog.filter(e => {
        const entryTime = new Date(e.timestamp).getTime();
        const currentTime = new Date(entry.timestamp).getTime();
        return (currentTime - entryTime) < 60000; // Últimos 60 segundos
      });
      
      if (recentEntries.length > 10) {
        alerts.push({
          timestamp: new Date().toISOString(),
          type: 'RAPID_OPERATIONS',
          severity: 'high',
          description: `${recentEntries.length} operaciones en 60 segundos`,
          details: entry
        });
      }
      
      // Detectar cambios masivos de stickers
      if (entry.action === 'BULK_ADD_STICKERS' || entry.action === 'BULK_REMOVE_STICKERS') {
        if (entry.details.usersAffected > 50) {
          alerts.push({
            timestamp: new Date().toISOString(),
            type: 'MASS_STICKER_CHANGE',
            severity: 'high',
            description: `Cambio masivo de stickers en ${entry.details.usersAffected} usuarios`,
            details: entry
          });
        }
      }
      
      // Mantener solo los últimos 1000 alertas
      if (alerts.length > 1000) {
        alerts.shift();
      }
      
      localStorage.setItem('dforzze_security_alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  },
  
  getLog: function(limit = 100, filter = null) {
    try {
      let auditLog = JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]');
      
      if (filter) {
        if (filter.action) {
          auditLog = auditLog.filter(e => e.action === filter.action);
        }
        if (filter.severity) {
          auditLog = auditLog.filter(e => e.severity === filter.severity);
        }
        if (filter.admin) {
          auditLog = auditLog.filter(e => e.admin === filter.admin);
        }
        if (filter.startDate && filter.endDate) {
          const start = new Date(filter.startDate).getTime();
          const end = new Date(filter.endDate).getTime();
          auditLog = auditLog.filter(e => {
            const time = new Date(e.timestamp).getTime();
            return time >= start && time <= end;
          });
        }
      }
      
      return auditLog.slice(-limit).reverse();
    } catch (error) {
      console.error('Error retrieving audit log:', error);
      return [];
    }
  },
  
  getSecurityAlerts: function(limit = 50) {
    try {
      const alerts = JSON.parse(localStorage.getItem('dforzze_security_alerts') || '[]');
      return alerts.slice(-limit).reverse();
    } catch (error) {
      console.error('Error retrieving security alerts:', error);
      return [];
    }
  },
  
  exportLog: function(format = 'json', filter = null) {
    try {
      const auditLog = this.getLog(5000, filter);
      
      if (format === 'csv') {
        return this.convertToCSV(auditLog);
      }
      
      return JSON.stringify(auditLog, null, 2);
    } catch (error) {
      console.error('Error exporting audit log:', error);
      return '';
    }
  },
  
  convertToCSV: function(data) {
    if (!data || data.length === 0) return '';
    
    const headers = ['ID', 'Timestamp', 'Action', 'Admin', 'Severity', 'Details'];
    const rows = data.map(entry => [
      entry.id || '',
      entry.timestamp || '',
      entry.action || '',
      entry.admin || '',
      entry.severity || '',
      JSON.stringify(entry.details || {})
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
  },
  
  getAuditSummary: function() {
    try {
      const auditLog = JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]');
      const alerts = JSON.parse(localStorage.getItem('dforzze_security_alerts') || '[]');
      
      const actionCounts = {};
      const severityCounts = { low: 0, medium: 0, high: 0 };
      
      auditLog.forEach(entry => {
        actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
        severityCounts[entry.severity] = (severityCounts[entry.severity] || 0) + 1;
      });
      
      return {
        totalEntries: auditLog.length,
        totalAlerts: alerts.length,
        actionCounts: actionCounts,
        severityCounts: severityCounts,
        recentAlerts: alerts.slice(-10).reverse()
      };
    } catch (error) {
      console.error('Error getting audit summary:', error);
      return null;
    }
  }
};

// ===== SISTEMA DE IMPORTACIÓN/EXPORTACIÓN =====
const AdminDataManagement = {
  exportAllData: function(format = 'json') {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      const codes = JSON.parse(localStorage.getItem('dforzze_codes') || '[]');
      const auditLog = JSON.parse(localStorage.getItem('dforzze_audit_log') || '[]');
      const orders = JSON.parse(localStorage.getItem('dforzze_orders') || '[]');
      
      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        users: users,
        codes: codes,
        auditLog: auditLog,
        orders: orders,
        summary: {
          totalUsers: users.length,
          totalCodes: codes.length,
          auditEntries: auditLog.length,
          totalOrders: orders.length,
          totalStickers: users.reduce((sum, u) => sum + (u.stickerCount || 0), 0)
        }
      };
      
      if (format === 'csv') {
        return this.convertExportToCSV(exportData);
      }
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  },
  
  importData: function(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      // Validar estructura
      if (!data.exportDate || !data.summary) {
        return {
          success: false,
          error: 'Formato de importación inválido'
        };
      }
      
      // Crear respaldo antes de importar
      this.backupData();
      
      if (data.users && Array.isArray(data.users)) {
        localStorage.setItem('dforzze_users', JSON.stringify(data.users));
      }
      
      if (data.codes && Array.isArray(data.codes)) {
        localStorage.setItem('dforzze_codes', JSON.stringify(data.codes));
      }
      
      if (data.auditLog && Array.isArray(data.auditLog)) {
        localStorage.setItem('dforzze_audit_log', JSON.stringify(data.auditLog));
      }
      
      if (data.orders && Array.isArray(data.orders)) {
        localStorage.setItem('dforzze_orders', JSON.stringify(data.orders));
      }
      
      AdminAuditTrail.log('DATA_IMPORT', {
        usersImported: data.users ? data.users.length : 0,
        codesImported: data.codes ? data.codes.length : 0,
        ordersImported: data.orders ? data.orders.length : 0,
        importDate: data.exportDate
      });
      
      return {
        success: true,
        message: 'Datos importados exitosamente',
        summary: data.summary
      };
    } catch (error) {
      console.error('Error importing data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  backupData: function() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        data: this.exportAllData('json')
      };
      
      const backupKey = `dforzze_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      
      // Mantener solo los últimos 10 respaldos
      const backupKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('dforzze_backup_'))
        .sort()
        .reverse();
      
      if (backupKeys.length > 10) {
        backupKeys.slice(10).forEach(key => localStorage.removeItem(key));
      }
      
      AdminAuditTrail.log('BACKUP_CREATED', {
        backupKey: backupKey
      });
      
      return {
        success: true,
        backupKey: backupKey,
        message: 'Respaldo creado exitosamente'
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  restoreBackup: function(backupKey) {
    try {
      const backup = JSON.parse(localStorage.getItem(backupKey));
      
      if (!backup || !backup.data) {
        return {
          success: false,
          error: 'Respaldo no encontrado'
        };
      }
      
      const result = this.importData(backup.data);
      
      if (result.success) {
        AdminAuditTrail.log('BACKUP_RESTORED', {
          backupKey: backupKey,
          restoredAt: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  getAvailableBackups: function() {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('dforzze_backup_'))
        .sort()
        .reverse();
      
      return backupKeys.map(key => {
        const backup = JSON.parse(localStorage.getItem(key));
        return {
          key: key,
          timestamp: backup.timestamp,
          size: new Blob([localStorage.getItem(key)]).size
        };
      });
    } catch (error) {
      console.error('Error getting available backups:', error);
      return [];
    }
  },
  
  convertExportToCSV: function(exportData) {
    let csv = '# DFORZZE DATA EXPORT\n';
    csv += `# Export Date: ${exportData.exportDate}\n`;
    csv += `# Version: ${exportData.exportVersion}\n\n`;
    
    // Resumen
    csv += '## SUMMARY\n';
    Object.entries(exportData.summary).forEach(([key, value]) => {
      csv += `${key},${value}\n`;
    });
    
    csv += '\n## USERS\n';
    csv += 'Name,Email,Rank,Stickers,Blocked,Created,LastActivity\n';
    exportData.users.forEach(user => {
      csv += `"${user.name}","${user.email}","${user.rank || 'NONE'}",${user.stickerCount || 0},"${user.blocked ? 'Yes' : 'No'}","${user.createdAt || ''}","${user.lastActivity || ''}"\n`;
    });
    
    return csv;
  }
};

// ===== SISTEMA DE EVENTOS ESPECIALES =====
const AdminSpecialEvents = {
  createEvent: function(eventName, stickerReward, userFilter = null) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let updated = 0;
      const changes = [];
      
      users.forEach(user => {
        // Aplicar filtro si existe
        if (userFilter && !userFilter(user)) return;
        
        const oldRank = user.rank || 'NONE';
        const oldStickers = user.stickerCount || 0;
        
        user.stickerCount = (user.stickerCount || 0) + stickerReward;
        
        // Actualizar rango
        if (user.stickerCount >= 15) user.rank = 'INNER';
        else if (user.stickerCount >= 7) user.rank = 'BUILDER';
        else if (user.stickerCount >= 3) user.rank = 'INITIATED';
        else user.rank = 'NONE';
        
        user.lastActivity = new Date().toISOString();
        
        changes.push({
          email: user.email,
          oldStickers: oldStickers,
          newStickers: user.stickerCount,
          oldRank: oldRank,
          newRank: user.rank
        });
        
        updated++;
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      AdminAuditTrail.log('SPECIAL_EVENT', {
        eventName: eventName,
        stickerReward: stickerReward,
        usersAffected: updated,
        changes: changes
      });
      
      return {
        success: true,
        updated: updated,
        changes: changes,
        message: `Evento "${eventName}" aplicado a ${updated} usuarios`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  createBirthdayBonus: function(userEmail) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      const user = users.find(u => u.email === userEmail);
      
      if (!user) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }
      
      const oldRank = user.rank || 'NONE';
      const oldStickers = user.stickerCount || 0;
      
      user.stickerCount = (user.stickerCount || 0) + 3;
      
      if (user.stickerCount >= 15) user.rank = 'INNER';
      else if (user.stickerCount >= 7) user.rank = 'BUILDER';
      else if (user.stickerCount >= 3) user.rank = 'INITIATED';
      
      user.lastActivity = new Date().toISOString();
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      AdminAuditTrail.log('BIRTHDAY_BONUS', {
        userEmail: userEmail,
        stickerReward: 3,
        oldStickers: oldStickers,
        newStickers: user.stickerCount,
        oldRank: oldRank,
        newRank: user.rank
      });
      
      return {
        success: true,
        message: `Bono de cumpleaños aplicado a ${user.name}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  createSeasonalBonus: function(season) {
    return this.createEvent(`${season} Seasonal Bonus`, 2);
  },
  
  createReferralBonus: function(referrerEmail, refereeEmail) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      const referrer = users.find(u => u.email === referrerEmail);
      const referee = users.find(u => u.email === refereeEmail);
      
      if (!referrer || !referee) {
        return {
          success: false,
          error: 'Uno o ambos usuarios no encontrados'
        };
      }
      
      const changes = [];
      
      // Bonus para referrer
      const referrerOldStickers = referrer.stickerCount || 0;
      referrer.stickerCount = (referrer.stickerCount || 0) + 2;
      if (referrer.stickerCount >= 15) referrer.rank = 'INNER';
      else if (referrer.stickerCount >= 7) referrer.rank = 'BUILDER';
      else if (referrer.stickerCount >= 3) referrer.rank = 'INITIATED';
      referrer.lastActivity = new Date().toISOString();
      
      changes.push({
        email: referrerEmail,
        type: 'referrer',
        oldStickers: referrerOldStickers,
        newStickers: referrer.stickerCount,
        reward: 2
      });
      
      // Bonus para referee
      const refereeOldStickers = referee.stickerCount || 0;
      referee.stickerCount = (referee.stickerCount || 0) + 1;
      if (referee.stickerCount >= 15) referee.rank = 'INNER';
      else if (referee.stickerCount >= 7) referee.rank = 'BUILDER';
      else if (referee.stickerCount >= 3) referee.rank = 'INITIATED';
      referee.lastActivity = new Date().toISOString();
      
      changes.push({
        email: refereeEmail,
        type: 'referee',
        oldStickers: refereeOldStickers,
        newStickers: referee.stickerCount,
        reward: 1
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      AdminAuditTrail.log('REFERRAL_BONUS', {
        referrer: referrerEmail,
        referee: refereeEmail,
        changes: changes
      });
      
      return {
        success: true,
        message: 'Bono de referencia aplicado',
        changes: changes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  createMilestoneBonus: function(milestone) {
    try {
      const users = JSON.parse(localStorage.getItem('dforzze_users') || '[]');
      let updated = 0;
      const changes = [];
      
      const milestoneMap = {
        '100_users': { filter: () => true, reward: 1, name: '100 Usuarios' },
        '1000_stickers': { filter: () => true, reward: 1, name: '1000 Stickers' },
        'first_inner': { filter: (u) => u.rank === 'INNER', reward: 2, name: 'Primer Inner' }
      };
      
      const config = milestoneMap[milestone];
      if (!config) {
        return {
          success: false,
          error: 'Milestone no reconocido'
        };
      }
      
      users.forEach(user => {
        if (!config.filter(user)) return;
        
        const oldStickers = user.stickerCount || 0;
        user.stickerCount = (user.stickerCount || 0) + config.reward;
        
        if (user.stickerCount >= 15) user.rank = 'INNER';
        else if (user.stickerCount >= 7) user.rank = 'BUILDER';
        else if (user.stickerCount >= 3) user.rank = 'INITIATED';
        
        user.lastActivity = new Date().toISOString();
        
        changes.push({
          email: user.email,
          oldStickers: oldStickers,
          newStickers: user.stickerCount,
          reward: config.reward
        });
        
        updated++;
      });
      
      localStorage.setItem('dforzze_users', JSON.stringify(users));
      
      AdminAuditTrail.log('MILESTONE_BONUS', {
        milestone: milestone,
        milestoneName: config.name,
        usersAffected: updated,
        changes: changes
      });
      
      return {
        success: true,
        updated: updated,
        message: `Bono de milestone "${config.name}" aplicado a ${updated} usuarios`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// ===== EXPORTAR PARA USO GLOBAL =====
if (typeof window !== 'undefined') {
  window.AdminAnalytics = AdminAnalytics;
  window.AdminBulkOperations = AdminBulkOperations;
  window.AdminAuditTrail = AdminAuditTrail;
  window.AdminDataManagement = AdminDataManagement;
  window.AdminSpecialEvents = AdminSpecialEvents;
}
