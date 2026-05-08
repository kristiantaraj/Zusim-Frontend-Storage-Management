const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /dashboard - summary counts
router.get('/', async (req, res) => {
  try {
    const [totalProducts, totalBatches, totalUnits, inCount, outCount, usedCount] = await Promise.all([
      prisma.product.count(),
      prisma.batch.count(),
      prisma.unit.count(),
      prisma.unit.count({ where: { status: 'IN' } }),
      prisma.unit.count({ where: { status: 'OUT' } }),
      prisma.unit.count({ where: { status: 'USED' } }),
    ]);

    const recentScans = await prisma.scanEvent.findMany({
      take: 10,
      orderBy: { scanned_at: 'desc' },
      include: {
        unit: { include: { product: { select: { name: true } } } },
      },
    });

    res.json({
      totalProducts,
      totalBatches,
      totalUnits,
      inCount,
      outCount,
      usedCount,
      recentScans,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
