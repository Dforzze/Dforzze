const Joi = require('joi');

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  createProduct: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).optional(),
    price: Joi.number().positive().required(),
    category: Joi.string().required(),
    stock: Joi.number().integer().min(0).required(),
    lowStockThreshold: Joi.number().integer().min(0).default(5),
    images: Joi.array().items(Joi.string()).optional(),
  }),

  updateStock: Joi.object({
    stock: Joi.number().integer().min(0).required(),
    reason: Joi.string().valid('restock', 'adjustment', 'return', 'damage').required(),
  }),

  createOrder: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
    shipping: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      district: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().default('PE'),
    }).required(),
    shippingMethod: Joi.string().valid('standard', 'express').required(),
    couponCode: Joi.string().optional(),
  }),

  redeemSticker: Joi.object({
    code: Joi.string().required(),
  }),

  generateCode: Joi.object({
    type: Joi.string().valid('sticker', 'discount').required(),
    dropName: Joi.string().when('type', { is: 'sticker', then: Joi.required() }),
    quantity: Joi.number().integer().min(1).default(1),
    discountValue: Joi.number().integer().min(1).max(100).when('type', { is: 'discount', then: Joi.required() }),
  }),

  productFilters: Joi.object({
    category: Joi.string().optional(),
    status: Joi.string().valid('available', 'low', 'out_of_stock').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),

  movementFilters: Joi.object({
    productId: Joi.string().uuid().optional(),
    type: Joi.string().valid('PURCHASE', 'ADJUSTMENT', 'RETURN', 'RESTOCK', 'DAMAGE').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

module.exports = schemas;
