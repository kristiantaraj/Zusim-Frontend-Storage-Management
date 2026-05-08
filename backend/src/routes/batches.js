const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../db');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// POST /batches - create a batch
router.post(
  '/',
  [
    body('product_id').isInt({ min: 1 }).withMessage('Valid product_id is required'),
    body('delivery_date').isISO8601().withMessage('Valid delivery_date (ISO 8601) is required'),
    body('notes').optional().trim(),
  ],
  validate,
  async (req, res) => {
    const { product_id, delivery_date, notes } = req.body;
    try {
      // Verify product exists
      const product = await prisma.product.findUnique({ where: { id: parseInt(product_id, 10) } });
      if (!product) return res.status(404).json({ error: 'Product not found.' });

      const batch = await prisma.batch.create({
        data: {
          product_id: parseInt(product_id, 10),
          delivery_date: new Date(delivery_date),
          notes: notes || null,
        },
        include: { product: true },
      });
      res.status(201).json(batch);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create batch.' });
    }
  }
);

// GET /batches - list batches (optionally filter by product_id)
router.get('/', async (req, res) => {
  const productId = req.query.product_id ? parseInt(req.query.product_id, 10) : undefined;
  try {
    const batches = await prisma.batch.findMany({
      where: productId ? { product_id: productId } : undefined,
      orderBy: { delivery_date: 'desc' },
      include: {
        product: { select: { id: true, name: true } },
        _count: { select: { units: true } },
      },
    });
    res.json(batches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch batches.' });
  }
});

module.exports = router;
