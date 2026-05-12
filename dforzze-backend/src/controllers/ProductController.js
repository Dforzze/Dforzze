const productService = require('../services/ProductService');
const inventoryService = require('../services/InventoryService');

class ProductController {
  async list(req, res, next) {
    try {
      const result = await productService.listProducts(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json({ success: true, data: { product } });
    } catch (err) {
      next(err);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { id } = req.params;
      const { stock, reason } = req.body;
      const result = await inventoryService.updateStock(id, stock, reason, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
