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
  try {
    const tickets = await prisma.ticket.findMany({
      where: { status },
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

module.exports = router;
