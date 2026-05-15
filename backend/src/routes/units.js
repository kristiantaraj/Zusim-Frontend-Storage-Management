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

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const parseUnitFilters = (queryParams) => {
  const productId = queryParams.product_id ? parseInt(queryParams.product_id, 10) : undefined;
  const batchId = queryParams.batch_id ? parseInt(queryParams.batch_id, 10) : undefined;
  const status = queryParams.status || undefined;
  const foremanId = queryParams.foreman_id ? parseInt(queryParams.foreman_id, 10) : undefined;
  const projectId = queryParams.project_id ? parseInt(queryParams.project_id, 10) : undefined;
  const unitId = queryParams.unit_id?.trim() || undefined;
  const fromDate = queryParams.from_date ? new Date(queryParams.from_date) : undefined;
  const toDate = queryParams.to_date ? new Date(queryParams.to_date) : undefined;

  const where = {
    ...(productId ? { product_id: productId } : {}),
    ...(batchId ? { batch_id: batchId } : {}),
    ...(status ? { status } : {}),
    ...(unitId ? { id: { contains: unitId, mode: 'insensitive' } } : {}),
    ...((fromDate || toDate)
      ? {
          updated_at: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  if (foremanId || projectId) {
    where.ticket_units = {
      some: {
        ticket: {
          ...(foremanId ? { foreman_id: foremanId } : {}),
          ...(projectId ? { project_id: projectId } : {}),
        },
      },
    };
  }

  return where;
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

// GET /units/export.csv - export filtered units to CSV
router.get(
  '/export.csv',
  [
    query('product_id').optional().isInt({ min: 1 }),
    query('batch_id').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['IN', 'OUT', 'USED']),
    query('foreman_id').optional().isInt({ min: 1 }),
    query('project_id').optional().isInt({ min: 1 }),
    query('unit_id').optional().isString(),
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601(),
  ],
  validate,
  async (req, res) => {
    try {
      const where = parseUnitFilters(req.query);

      const units = await prisma.unit.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        include: {
          product: { select: { name: true } },
          batch: { select: { id: true, delivery_date: true } },
          ticket_units: {
            where: { ticket: { status: 'OPEN' } },
            include: {
              ticket: {
                select: {
                  id: true,
                  foreman: { select: { name: true } },
                  project: { select: { name: true } },
                },
              },
            },
            take: 1,
          },
        },
      });

      const header = [
        'unit_id',
        'status',
        'product',
        'batch_id',
        'delivery_date',
        'open_ticket_id',
        'foreman',
        'project',
        'created_at',
        'updated_at',
      ];

      const rows = units.map((u) => {
        const openTicket = u.ticket_units[0]?.ticket;
        return [
          u.id,
          u.status,
          u.product?.name || '',
          u.batch?.id || '',
          u.batch?.delivery_date ? new Date(u.batch.delivery_date).toISOString() : '',
          openTicket?.id || '',
          openTicket?.foreman?.name || '',
          openTicket?.project?.name || '',
          new Date(u.created_at).toISOString(),
          new Date(u.updated_at).toISOString(),
        ]
          .map(csvEscape)
          .join(',');
      });

      const csv = `${header.join(',')}\n${rows.join('\n')}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="units-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to export units.' });
    }
  }
);

// GET /units - list units with advanced filters
router.get(
  '/',
  [
    query('product_id').optional().isInt({ min: 1 }),
    query('batch_id').optional().isInt({ min: 1 }),
    query('status').optional().isIn(['IN', 'OUT', 'USED']),
    query('foreman_id').optional().isInt({ min: 1 }),
    query('project_id').optional().isInt({ min: 1 }),
    query('unit_id').optional().isString(),
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    try {
      const where = parseUnitFilters(req.query);

      const [units, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          orderBy: { updated_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            product: { select: { id: true, name: true } },
            batch: { select: { id: true, delivery_date: true } },
            ticket_units: {
              where: { ticket: { status: 'OPEN' } },
              include: {
                ticket: {
                  select: {
                    id: true,
                    foreman: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                  },
                },
              },
              take: 1,
            },
          },
        }),
        prisma.unit.count({ where }),
      ]);

      const mapped = units.map((u) => ({
        ...u,
        open_ticket: u.ticket_units[0]?.ticket || null,
      }));

      res.json({ units: mapped, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch units.' });
    }
  }
);

// GET /units/print-jobs - print history / failed queue
router.get('/print-jobs', async (req, res) => {
  const onlyFailed = req.query.only_failed === '1';
  try {
    const jobs = await prisma.printJob.findMany({
      where: onlyFailed ? { status: 'FAILED' } : {},
      include: {
        unit: {
          select: {
            id: true,
            product: { select: { name: true } },
            batch: { select: { delivery_date: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch print jobs.' });
  }
});

// POST /units/print-jobs - log a print attempt
router.post(
  '/print-jobs',
  [
    body('unit_id').trim().notEmpty().withMessage('unit_id is required'),
    body('status').isIn(['SUCCESS', 'FAILED']).withMessage('status must be SUCCESS or FAILED'),
    body('error').optional().isString().isLength({ max: 500 }),
    body('requested_by').optional().isString().isLength({ max: 100 }),
  ],
  validate,
  async (req, res) => {
    const { unit_id, status, error, requested_by } = req.body;

    try {
      const unit = await prisma.unit.findUnique({ where: { id: unit_id } });
      if (!unit) return res.status(404).json({ error: 'Unit not found.', code: 'UNIT_NOT_FOUND' });

      const job = await prisma.printJob.create({
        data: {
          unit_id,
          status,
          error: error || null,
          requested_by: requested_by || null,
        },
      });
      res.status(201).json(job);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to log print job.' });
    }
  }
);

// GET /units/:id/label - fetch printable unit label data
router.get('/:id/label', async (req, res) => {
  const { id } = req.params;
  try {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        batch: { select: { delivery_date: true } },
      },
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found.' });

    res.json({
      unit_id: unit.id,
      product_name: unit.product?.name || '',
      batch_date: unit.batch?.delivery_date || null,
      status: unit.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch label data.' });
  }
});

// POST /units/:id/force - force-correct unit status with reason/note
router.post(
  '/:id/force',
  [
    body('status').isIn(['IN', 'OUT', 'USED']).withMessage('status must be IN, OUT or USED'),
    body('reason_code').trim().notEmpty().isLength({ max: 50 }).withMessage('reason_code is required'),
    body('note').optional().isString().isLength({ max: 500 }),
    body('foreman_id').optional().isInt({ min: 1 }),
    body('project_id').optional().isInt({ min: 1 }),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { status, reason_code, note, foreman_id, project_id } = req.body;

    try {
      const existing = await prisma.unit.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Unit not found.', code: 'UNIT_NOT_FOUND' });

      const foremanId = foreman_id ? parseInt(foreman_id, 10) : null;
      const projectId = project_id ? parseInt(project_id, 10) : null;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.unit.update({
          where: { id },
          data: { status },
          include: { product: { select: { name: true } } },
        });

        await tx.scanEvent.create({
          data: {
            unit_id: id,
            action: status,
            foreman_id: foremanId,
            note: `[FORCE:${reason_code}] ${note || ''}`.trim(),
          },
        });

        if (status === 'OUT' && foremanId && projectId) {
          let ticket = await tx.ticket.findFirst({
            where: { foreman_id: foremanId, project_id: projectId, status: 'OPEN' },
          });

          if (!ticket) {
            ticket = await tx.ticket.create({
              data: {
                foreman_id: foremanId,
                project_id: projectId,
                note: 'force-corrected flow',
              },
            });
          }

          await tx.ticketUnit.upsert({
            where: { ticket_id_unit_id: { ticket_id: ticket.id, unit_id: id } },
            create: { ticket_id: ticket.id, unit_id: id, returned: false },
            update: { returned: false, returned_at: null },
          });
        }

        if (status === 'IN' || status === 'USED') {
          const ticketUnits = await tx.ticketUnit.findMany({
            where: { unit_id: id, returned: false, ticket: { status: 'OPEN' } },
            include: { ticket: true },
          });

          for (const tu of ticketUnits) {
            await tx.ticketUnit.update({
              where: { id: tu.id },
              data: { returned: true, returned_at: new Date() },
            });

            const pending = await tx.ticketUnit.count({
              where: { ticket_id: tu.ticket_id, returned: false },
            });

            if (pending === 0) {
              await tx.ticket.update({
                where: { id: tu.ticket_id },
                data: {
                  status: 'CLOSED',
                  closed_at: new Date(),
                  closed_by: 'manager-force',
                },
              });
            }
          }
        }

        return updated;
      });

      res.json({
        success: true,
        unit: {
          id: result.id,
          status: result.status,
          product: result.product?.name,
          updated_at: result.updated_at,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to force-correct unit status.' });
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
