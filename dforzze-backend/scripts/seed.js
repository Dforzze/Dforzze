const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear admin
  const adminPassword = await bcrypt.hash('dforzze2025', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dforzze.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@dforzze.com',
      password: adminPassword,
      role: 'ADMIN',
      rank: 'INNER',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Crear productos
  const products = [
    {
      name: 'DFORZZE SHORT 01',
      description: 'Short deportivo DFORZZE colección 01',
      price: 80.00,
      category: 'Pantalones',
      stock: 20,
      lowStockThreshold: 5,
      images: ['images/1.png'],
      active: true,
    },
    {
      name: 'DFORZZE SHORT 02',
      description: 'Short deportivo DFORZZE colección 02',
      price: 80.00,
      category: 'Pantalones',
      stock: 20,
      lowStockThreshold: 5,
      images: ['images/2.png'],
      active: true,
    },
    {
      name: 'DFORZZE TEE SAKURA',
      description: 'Camiseta Sakura — Colección 01',
      price: 70.00,
      category: 'Camisetas',
      stock: 0,
      lowStockThreshold: 5,
      images: ['images/polosakura.png'],
      active: true,
    },
    {
      name: 'DFORZZE TEE SAKURA 02',
      description: 'Camiseta Sakura 02 — Colección 01',
      price: 70.00,
      category: 'Camisetas',
      stock: 0,
      lowStockThreshold: 5,
      images: ['images/polosakura2.png'],
      active: true,
    },
    {
      name: 'DFORZZE ZIP HOODIE',
      description: 'Zip Hoodie DFORZZE — Colección 01',
      price: 110.00,
      category: 'Hoodies',
      stock: 0,
      lowStockThreshold: 5,
      images: ['images/ziphodie.png'],
      active: true,
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { name: product.name },
      update: { stock: product.stock, price: product.price },
      create: product,
    });
    console.log(`✅ Producto: ${created.name} (stock: ${created.stock})`);
  }

  // Crear cupones iniciales
  const coupons = [
    { code: 'DFORZZE10', type: 'discount', value: 10, active: true },
    { code: '10OFF', type: 'discount', value: 10, active: true },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
    console.log(`✅ Cupón: ${coupon.code}`);
  }

  console.log('🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
