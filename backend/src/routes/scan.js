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

// POST /scan/out - mark a unit as OUT and attach to a ticket
router.post(
  '/out',
  [
    body('unit_id').trim().notEmpty().withMessage('unit_id is required'),
    body('foreman_id').optional().isInt({ min: 1 }).withMessage('foreman_id must be a positive integer'),
    body('project_id').optional().isInt({ min: 1 }).withMessage('project_id must be a positive integer'),
  ],
  validate,
  async (req, res) => {
    const { unit_id, note, foreman_id, project_id } = req.body;

    try {
      const unit = await prisma.unit.findUnique({
        where: { id: unit_id },
        include: { product: { select: { name: true } } },
      });

      if (!unit) {
        return res.status(404).json({ error: 'Unit not found.', code: 'UNIT_NOT_FOUND' });
      }

      if (unit.status === 'OUT') {
        return res.status(409).json({
          error: 'Unit is already marked as OUT.',
          code: 'ALREADY_OUT',
          unit: { id: unit.id, status: unit.status, updated_at: unit.updated_at },
        });
      }

      const foremanId = foreman_id ? parseInt(foreman_id, 10) : null;
      const projectId = project_id ? parseInt(project_id, 10) : null;

      if (foremanId) {
        const foreman = await prisma.foreman.findUnique({ where: { id: foremanId } });
        if (!foreman) {
          return res.status(404).json({ error: 'Foreman not found.', code: 'FOREMAN_NOT_FOUND' });
        }
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
          return res.status(404).json({ error: 'Project not found.', code: 'PROJECT_NOT_FOUND' });
        }
      }

      const updatedUnit = await prisma.$transaction(async (tx) => {
        const updated = await tx.unit.update({
          where: { id: unit_id },
          data: { status: 'OUT' },
          include: { product: { select: { name: true } } },
        });

        await tx.scanEvent.create({
          data: { unit_id, action: 'OUT', note: note || null, foreman_id: foremanId },
        });

        // Create or reuse an open ticket for this foreman+project pair
        if (foremanId && projectId) {
          let ticket = await tx.ticket.findFirst({
            where: { foreman_id: foremanId, project_id: projectId, status: 'OPEN' },
          });

          if (!ticket) {
            ticket = await tx.ticket.create({
              data: { foreman_id: foremanId, project_id: projectId },
            });
          }

          await tx.ticketUnit.upsert({
            where: { ticket_id_unit_id: { ticket_id: ticket.id, unit_id } },
            create: { ticket_id: ticket.id, unit_id, returned: false },
            update: { returned: false, returned_at: null },
          });
        }

        return updated;
      });

      res.json({
        success: true,
        unit: {
          id: updatedUnit.id,
          status: updatedUnit.status,
          product: updatedUnit.product?.name,
          updated_at: updatedUnit.updated_at,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Scan failed.', code: 'SERVER_ERROR' });
    }
  }
);

// POST /scan/in - mark a unit as IN (unused return) or USED (empty return)
router.post(
  '/in',
  [
    body('unit_id').trim().notEmpty().withMessage('unit_id is required'),
    body('foreman_id').optional().isInt({ min: 1 }).withMessage('foreman_id must be a positive integer'),
    body('as_used').optional().isBoolean().withMessage('as_used must be a boolean'),
  ],
  validate,
  async (req, res) => {
    const { unit_id, note, foreman_id, as_used } = req.body;
    const newStatus = as_used ? 'USED' : 'IN';

    try {
      const unit = await prisma.unit.findUnique({
        where: { id: unit_id },
        include: { product: { select: { name: true } } },
      });

      if (!unit) {
        return res.status(404).json({ error: 'Unit not found.', code: 'UNIT_NOT_FOUND' });
      }

      if (unit.status === 'IN' || unit.status === 'USED') {
        return res.status(409).json({
          error: 'Unit is already marked as IN.',
          code: 'ALREADY_IN',
          unit: { id: unit.id, status: unit.status, updated_at: unit.updated_at },
        });
      }

      const foremanId = foreman_id ? parseInt(foreman_id, 10) : null;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.unit.update({
          where: { id: unit_id },
          data: { status: newStatus },
          include: { product: { select: { name: true } } },
        });

        await tx.scanEvent.create({
          data: { unit_id, action: newStatus, note: note || null, foreman_id: foremanId },
        });

        // Find the open ticket containing this unit and mark it returned
        const ticketUnit = await tx.ticketUnit.findFirst({
          where: { unit_id, returned: false, ticket: { status: 'OPEN' } },
          include: { ticket: true },
        });

        let autoClosedTicket = null;

        if (ticketUnit) {
          await tx.ticketUnit.update({
            where: { id: ticketUnit.id },
            data: { returned: true, returned_at: new Date() },
          });

          const pendingCount = await tx.ticketUnit.count({
            where: { ticket_id: ticketUnit.ticket_id, returned: false },
          });

          if (pendingCount === 0) {
            await tx.ticket.update({
              where: { id: ticketUnit.ticket_id },
              data: { status: 'CLOSED', closed_at: new Date(), closed_by: 'auto' },
            });
            autoClosedTicket = ticketUnit.ticket_id;
          }
        }

        return { updated, autoClosedTicket };
      });

      res.json({
        success: true,
        unit: {
          id: result.updated.id,
          status: result.updated.status,
          product: result.updated.product?.name,
          updated_at: result.updated.updated_at,
        },
        autoClosedTicket: result.autoClosedTicket,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Scan failed.', code: 'SERVER_ERROR' });
    }
  }
);

module.exports = router;
