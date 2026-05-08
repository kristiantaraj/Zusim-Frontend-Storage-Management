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

// GET /foremen - list all foremen
router.get('/', async (_req, res) => {
  try {
    const foremen = await prisma.foreman.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(foremen);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch foremen.' });
  }
});

// POST /foremen - create a foreman
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('name is required'),
    body('icon').optional().isString().trim().isLength({ max: 10 }).withMessage('icon is too long'),
  ],
  validate,
  async (req, res) => {
    const { name, icon } = req.body;

    try {
      const foreman = await prisma.foreman.create({
        data: {
          name,
          icon: icon?.trim() || null,
        },
      });
      res.status(201).json(foreman);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Foreman with this name already exists.', code: 'FOREMAN_EXISTS' });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to create foreman.' });
    }
  }
);

// DELETE /foremen/:id - remove a foreman (scan history keeps data nullable)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid foreman ID.' });
  }

  try {
    await prisma.foreman.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Foreman not found.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete foreman.' });
  }
});

module.exports = router;
