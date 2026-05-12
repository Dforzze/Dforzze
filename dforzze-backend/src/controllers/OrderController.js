const orderService = require('../services/OrderService');

class OrderController {
  async create(req, res, next) {
    try {
      const result = await orderService.createOrder(req.user.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const result = await orderService.getOrders(req.user.id, isAdmin, req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const order = await orderService.getOrderById(req.params.id, req.user.id, isAdmin);
      res.json({ success: true, data: { order } });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
