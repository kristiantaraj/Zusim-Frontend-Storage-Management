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

// GET /projects - list all projects
router.get('/', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /projects - create a project
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('name is required')],
  validate,
  async (req, res) => {
    const { name } = req.body;
    try {
      const project = await prisma.project.create({ data: { name } });
      res.status(201).json(project);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Project with this name already exists.', code: 'PROJECT_EXISTS' });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to create project.' });
    }
  }
);

// DELETE /projects/:id - delete a project (only if no open tickets)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid project ID.' });
  }
  try {
    const openTickets = await prisma.ticket.count({ where: { project_id: id, status: 'OPEN' } });
    if (openTickets > 0) {
      return res.status(409).json({ error: 'Cannot delete project with open tickets.', code: 'HAS_OPEN_TICKETS' });
    }
    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Project not found.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
