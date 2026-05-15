let PrismaClient;

// In this workspace, schema lives outside backend/, so generated client is in root node_modules.
try {
  ({ PrismaClient } = require('../../node_modules/@prisma/client'));
} catch {
  ({ PrismaClient } = require('@prisma/client'));
}


const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // For Prisma >=4.15.0, pool config is supported
  pool: {
    max: 2,
    min: 1,
  },
});

module.exports = prisma;
