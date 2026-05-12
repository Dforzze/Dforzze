const { PrismaClient } = require('@prisma/client');
const env = require('./environment');

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'minimal',
});

// Manejo de señales de cierre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

/**
 * Verifica la conexión a la base de datos
 */
async function checkConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    return false;
  }
}

module.exports = { prisma, checkConnection };
