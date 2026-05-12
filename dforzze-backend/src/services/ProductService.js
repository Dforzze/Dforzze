const { prisma } = require('../config/database');
const cache = require('./CacheService');
const { NotFoundError } = require('../middleware/errorHandler');

class ProductService {
  /**
   * Lista productos con paginación y filtros
   */
  async listProducts({ category, status, page = 1, limit = 50 }) {
    const cacheKey = `products:list:${category || 'all'}:${status || 'all'}:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const where = { active: true };
    if (category) where.category = category;
    if (status === 'available') where.stock = { gt: 5 };
    else if (status === 'low') where.stock = { gt: 0, lte: 5 };
    else if (status === 'out_of_stock') where.stock = 0;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, description: true, price: true,
          category: true, stock: true, lowStockThreshold: true,
          images: true, active: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const result = {
      products: products.map(p => ({
        ...p,
        status: p.stock === 0 ? 'out_of_stock' : p.stock <= p.lowStockThreshold ? 'low' : 'available',
        price: parseFloat(p.price),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Obtiene un producto por ID con historial de movimientos
   */
  async getProductById(id) {
    const cacheKey = `product:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, type: true, quantity: true,
            previousStock: true, newStock: true,
            orderId: true, reason: true, createdAt: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundError('Producto no encontrado');

    const result = {
      ...product,
      price: parseFloat(product.price),
      status: product.stock === 0 ? 'out_of_stock' : product.stock <= product.lowStockThreshold ? 'low' : 'available',
    };

    await cache.set(cacheKey, result, 60);
    return result;
  }

  /**
   * Crea un nuevo producto
   */
  async createProduct(data) {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold || 5,
        images: data.images || [],
      },
    });

    await cache.invalidatePattern('products:list:*');
    return { ...product, price: parseFloat(product.price) };
  }

  /**
   * Actualiza un producto (solo admin)
   */
  async updateProduct(id, data) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Producto no encontrado');

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price && { price: data.price }),
        ...(data.category && { category: data.category }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
        ...(data.images && { images: data.images }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    await cache.del(`product:${id}`);
    await cache.invalidatePattern('products:list:*');
    return { ...updated, price: parseFloat(updated.price) };
  }

  /**
   * Elimina un producto (soft delete)
   */
  async deleteProduct(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError('Producto no encontrado');

    await prisma.product.update({ where: { id }, data: { active: false } });
    await cache.del(`product:${id}`);
    await cache.invalidatePattern('products:list:*');
    return { deleted: true };
  }
}

module.exports = new ProductService();
