let PrismaClient;

// In this workspace, schema lives outside backend/, so generated client is in root node_modules.
try {
  ({ PrismaClient } = require('../../node_modules/@prisma/client'));
} catch {
  ({ PrismaClient } = require('@prisma/client'));
}


const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
