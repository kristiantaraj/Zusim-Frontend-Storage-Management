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

const ticketInclude = {
  foreman: { select: { id: true, name: true, icon: true } },
  project: { select: { id: true, name: true } },
  ticket_units: {
    include: {
      unit: { include: { product: { select: { name: true } } } },
    },
    orderBy: { id: 'asc' },
  },
};

// GET /tickets?status=OPEN|CLOSED - list tickets (default: OPEN)
router.get('/', async (req, res) => {
  const status = req.query.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
  const projectId = req.query.project_id ? parseInt(req.query.project_id, 10) : undefined;
  const foremanId = req.query.foreman_id ? parseInt(req.query.foreman_id, 10) : undefined;
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        status,
        ...(projectId ? { project_id: projectId } : {}),
        ...(foremanId ? { foreman_id: foremanId } : {}),
      },
      include: ticketInclude,
      orderBy: { opened_at: 'desc' },
    });
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// PATCH /tickets/:id/close - manager manually closes a ticket
router.patch(
  '/:id/close',
  [body('note').optional().isString().trim().isLength({ max: 500 })],
  validate,
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID.' });
    }

    try {
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.', code: 'TICKET_NOT_FOUND' });
      }
      if (ticket.status === 'CLOSED') {
        return res.status(409).json({ error: 'Ticket is already closed.', code: 'ALREADY_CLOSED' });
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closed_at: new Date(),
          closed_by: 'manager',
          note: req.body.note || null,
        },
        include: ticketInclude,
      });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to close ticket.' });
    }
  }
);

// PATCH /tickets/:id/reopen - reopen closed ticket
router.patch('/:id/reopen', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID.' });

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.', code: 'TICKET_NOT_FOUND' });
    if (ticket.status === 'OPEN') {
      return res.status(409).json({ error: 'Ticket is already open.', code: 'ALREADY_OPEN' });
    }

    const reopened = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'OPEN',
        closed_at: null,
        closed_by: null,
      },
      include: ticketInclude,
    });

    res.json(reopened);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reopen ticket.' });
  }
});

// POST /tickets/merge - merge source tickets into target
router.post(
  '/merge',
  [
    body('target_ticket_id').isInt({ min: 1 }).withMessage('target_ticket_id is required'),
    body('source_ticket_ids').isArray({ min: 1 }).withMessage('source_ticket_ids must be a non-empty array'),
    body('source_ticket_ids.*').isInt({ min: 1 }),
    body('note').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    const targetTicketId = parseInt(req.body.target_ticket_id, 10);
    const sourceTicketIds = req.body.source_ticket_ids.map((id) => parseInt(id, 10)).filter((id) => id !== targetTicketId);
    const note = req.body.note || null;

    if (!sourceTicketIds.length) {
      return res.status(400).json({ error: 'At least one source ticket is required.' });
    }

    try {
      const merged = await prisma.$transaction(async (tx) => {
        const target = await tx.ticket.findUnique({ where: { id: targetTicketId } });
        if (!target) throw new Error('TARGET_NOT_FOUND');

        const sources = await tx.ticket.findMany({
          where: { id: { in: sourceTicketIds } },
          include: { ticket_units: true },
        });

        if (sources.length !== sourceTicketIds.length) throw new Error('SOURCE_NOT_FOUND');

        for (const src of sources) {
          for (const tu of src.ticket_units) {
            await tx.ticketUnit.upsert({
              where: { ticket_id_unit_id: { ticket_id: targetTicketId, unit_id: tu.unit_id } },
              create: {
                ticket_id: targetTicketId,
                unit_id: tu.unit_id,
                returned: tu.returned,
                returned_at: tu.returned_at,
              },
              update: {
                returned: tu.returned,
                returned_at: tu.returned_at,
              },
            });
          }

          await tx.ticket.update({
            where: { id: src.id },
            data: {
              status: 'CLOSED',
              closed_at: new Date(),
              closed_by: 'manager-merge',
              note: `Merged into #${targetTicketId}${note ? ` - ${note}` : ''}`,
            },
          });
        }

        return tx.ticket.findUnique({ where: { id: targetTicketId }, include: ticketInclude });
      });

      res.json(merged);
    } catch (err) {
      if (err.message === 'TARGET_NOT_FOUND') {
        return res.status(404).json({ error: 'Target ticket not found.' });
      }
      if (err.message === 'SOURCE_NOT_FOUND') {
        return res.status(404).json({ error: 'One or more source tickets were not found.' });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to merge tickets.' });
    }
  }
);

// POST /tickets/:id/split - move selected units into a new ticket
router.post(
  '/:id/split',
  [
    body('unit_ids').isArray({ min: 1 }).withMessage('unit_ids must be a non-empty array'),
    body('unit_ids.*').isString().notEmpty(),
    body('note').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const unitIds = req.body.unit_ids;
    const note = req.body.note || null;

    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID.' });

    try {
      const split = await prisma.$transaction(async (tx) => {
        const source = await tx.ticket.findUnique({
          where: { id },
          include: { ticket_units: true },
        });

        if (!source) throw new Error('SOURCE_NOT_FOUND');
        if (source.status !== 'OPEN') throw new Error('SOURCE_NOT_OPEN');

        const selected = source.ticket_units.filter((tu) => unitIds.includes(tu.unit_id));
        if (!selected.length) throw new Error('NO_MATCHING_UNITS');
        if (selected.length === source.ticket_units.length) throw new Error('ALL_UNITS_SELECTED');

        const newTicket = await tx.ticket.create({
          data: {
            foreman_id: source.foreman_id,
            project_id: source.project_id,
            note: `Split from #${source.id}${note ? ` - ${note}` : ''}`,
          },
        });

        for (const tu of selected) {
          await tx.ticketUnit.delete({ where: { id: tu.id } });
          await tx.ticketUnit.create({
            data: {
              ticket_id: newTicket.id,
              unit_id: tu.unit_id,
              returned: tu.returned,
              returned_at: tu.returned_at,
            },
          });
        }

        return tx.ticket.findUnique({ where: { id: newTicket.id }, include: ticketInclude });
      });

      res.status(201).json(split);
    } catch (err) {
      if (err.message === 'SOURCE_NOT_FOUND') return res.status(404).json({ error: 'Ticket not found.' });
      if (err.message === 'SOURCE_NOT_OPEN') return res.status(409).json({ error: 'Only open tickets can be split.' });
      if (err.message === 'NO_MATCHING_UNITS') return res.status(400).json({ error: 'No matching units found in source ticket.' });
      if (err.message === 'ALL_UNITS_SELECTED') return res.status(400).json({ error: 'Cannot move all units. Use close/reopen or merge instead.' });
      console.error(err);
      res.status(500).json({ error: 'Failed to split ticket.' });
    }
  }
);

module.exports = router;
