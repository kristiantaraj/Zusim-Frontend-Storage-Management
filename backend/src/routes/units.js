const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../db');
const { generateUnitIds } = require('../utils/idGenerator');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// POST /units/generate - generate N units for a batch
router.post(
  '/generate',
  [
    body('batch_id').isInt({ min: 1 }).withMessage('Valid batch_id is required'),
    body('quantity').isInt({ min: 1, max: 500 }).withMessage('quantity must be between 1 and 500'),
    body('location').optional().trim(),
  ],
  validate,
  async (req, res) => {
    const { batch_id, quantity, location } = req.body;
    const batchId = parseInt(batch_id, 10);
    const qty = parseInt(quantity, 10);

    try {
      // Fetch batch with product
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: { product: true },
      });
      if (!batch) return res.status(404).json({ error: 'Batch not found.' });

      const year = new Date().getFullYear();
      const ids = await generateUnitIds(qty, year);

      const units = await prisma.$transaction(
        ids.map((id) =>
          prisma.unit.create({
            data: {
              id,
              product_id: batch.product_id,
              batch_id: batchId,
              status: 'IN',
              location: location || null,
            },
          })
        )
      );

      res.status(201).json({
        batch,
        units: units.map((u) => ({ id: u.id, status: u.status, created_at: u.created_at })),
        count: units.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate units.' });
    }
  }
);

// GET /units - list units with filters
router.get(
  '/',
  [
    query('product_id').optional().isInt({ min: 1 }),
    query('batch_id').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['IN', 'OUT']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  async (req, res) => {
    const productId = req.query.product_id ? parseInt(req.query.product_id, 10) : undefined;
    const batchId = req.query.batch_id ? parseInt(req.query.batch_id, 10) : undefined;
    const status = req.query.status || undefined;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    try {
      const where = {
        ...(productId ? { product_id: productId } : {}),
        ...(batchId ? { batch_id: batchId } : {}),
        ...(status ? { status } : {}),
      };

      const [units, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            product: { select: { id: true, name: true } },
            batch: { select: { id: true, delivery_date: true } },
          },
        }),
        prisma.unit.count({ where }),
      ]);

      res.json({ units, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch units.' });
    }
  }
);

// GET /units/:id - single unit
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        product: true,
        batch: true,
        scan_events: { orderBy: { scanned_at: 'desc' }, take: 10 },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found.' });
    res.json(unit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch unit.' });
  }
});

module.exports = router;
