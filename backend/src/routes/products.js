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

// GET /products - list all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
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

module.exports = router;
