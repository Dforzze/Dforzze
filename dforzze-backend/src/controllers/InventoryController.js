const inventoryService = require('../services/InventoryService');
const alertService = require('../services/AlertService');

class InventoryController {
  async getMovements(req, res, next) {
    try {
      const result = await inventoryService.getMovements(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const result = await alertService.getAlerts();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      await alertService.acknowledgeAlert(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async exportCSV(req, res, next) {
    try {
      const csv = await inventoryService.exportMovementsCSV(req.query);
      const filename = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\uFEFF' + csv); // BOM para Excel
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InventoryController();
