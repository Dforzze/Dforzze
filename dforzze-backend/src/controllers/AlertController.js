const alertService = require('../services/AlertService');

class AlertController {
  /**
   * GET /api/alerts
   * Obtiene alertas con filtros
   */
  async getAlerts(req, res, next) {
    try {
      const { acknowledged, type, productId, page, limit } = req.query;
      const result = await alertService.getAlerts({
        acknowledged,
        type,
        productId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/alerts/summary
   * Obtiene resumen de alertas
   */
  async getSummary(req, res, next) {
    try {
      const summary = await alertService.getAlertsSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/alerts/:id/acknowledge
   * Marca alerta como reconocida
   */
  async acknowledge(req, res, next) {
    try {
      const alert = await alertService.acknowledgeAlert(req.params.id);
      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AlertController();
