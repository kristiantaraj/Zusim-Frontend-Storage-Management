const express = require('express');
const { body, query, validationResult } = require('express-validator');
const prisma = require('../db');

const router = express.Router();

// Validation middleware helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// POST /products - create a product
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('manufacturer_barcode').optional().trim(),
    body('size').optional().trim(),
  ],
  validate,
  async (req, res) => {
    const { name, manufacturer_barcode, size } = req.body;
    try {
      const product = await prisma.product.create({
        data: { name, manufacturer_barcode: manufacturer_barcode || null, size: size || null },
      });
      res.status(201).json(product);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'A product with this manufacturer barcode already exists.' });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to create product.' });
    }
  }
);

// GET /products - list products (active by default)
router.get('/', async (req, res) => {
  const includeInactive = req.query.include_inactive === '1';
  try {
    const products = await prisma.product.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { units: true, batches: true } },
      },
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// GET /products/:id - single product
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID.' });
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { batches: true, _count: { select: { units: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

// DELETE /products/:id - soft delete product
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product ID.' });

  try {
    const openOutUnits = await prisma.unit.count({
      where: { product_id: id, status: 'OUT' },
    });

    if (openOutUnits > 0) {
      return res.status(409).json({
        error: 'Cannot archive product with units currently OUT.',
        code: 'HAS_OUT_UNITS',
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { is_active: false, deleted_at: new Date() },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found.' });
    console.error(err);
    res.status(500).json({ error: 'Failed to archive product.' });
  }
});

// POST /products/:id/restore - restore archived product
router.post('/:id/restore', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product ID.' });

  try {
    const restored = await prisma.product.update({
      where: { id },
      data: { is_active: true, deleted_at: null },
    });
    res.json(restored);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found.' });
    console.error(err);
    res.status(500).json({ error: 'Failed to restore product.' });
  }
});

module.exports = router;
