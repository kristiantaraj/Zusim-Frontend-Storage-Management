const express = require('express');
const { query, validationResult } = require('express-validator');
const ExcelJS = require('exceljs');
const prisma = require('../db');

const router = express.Router();

const REPORT_I18N = {
  pl: {
    sheets: {
      summary: 'Podsumowanie',
      scans: 'Logi skanowania',
      tickets: 'Logi zgłoszeń',
      prints: 'Logi wydruków',
    },
    summaryHeader: ['Metryka', 'Wartość'],
    summaryRows: {
      period: 'Okres raportu',
      from: 'Od',
      to: 'Do',
      generatedAt: 'Utworzono raport',
      product: 'Produkt',
      scanEvents: 'Zdarzenia skanowania',
      ticketsInPeriod: 'Zgłoszenia otwarte/zamknięte w okresie',
      printJobsInPeriod: 'Wydruki w okresie',
      currentIn: 'Aktualne jednostki IN',
      currentOut: 'Aktualne jednostki OUT',
      currentUsed: 'Aktualne jednostki USED',
    },
    scansHeader: ['Czas skanowania', 'ID jednostki', 'Produkt', 'Akcja', 'Brygadzista', 'Notatka'],
    ticketsHeader: [
      'ID zgłoszenia',
      'Status',
      'Brygadzista',
      'Projekt',
      'Otwarte',
      'Zamknięte',
      'Zamknięte przez',
      'Liczba jednostek',
      'Oczekujące jednostki',
      'Notatka',
    ],
    printsHeader: ['Utworzono', 'ID jednostki', 'Produkt', 'Status', 'Zlecił', 'Błąd'],
    periodLabels: {
      weekly: 'tygodniowy',
      monthly: 'miesięczny',
      custom: 'niestandardowy',
    },
    filenamePrefix: 'raport-zusim',
  },
  en: {
    sheets: {
      summary: 'Summary',
      scans: 'Scan Logs',
      tickets: 'Ticket Logs',
      prints: 'Print Logs',
    },
    summaryHeader: ['Metric', 'Value'],
    summaryRows: {
      period: 'Report Period',
      from: 'From',
      to: 'To',
      generatedAt: 'Report Generated At',
      product: 'Product',
      scanEvents: 'Scan Events',
      ticketsInPeriod: 'Tickets Opened/Closed in Period',
      printJobsInPeriod: 'Print Jobs in Period',
      currentIn: 'Current Units IN',
      currentOut: 'Current Units OUT',
      currentUsed: 'Current Units USED',
    },
    scansHeader: ['Scanned At', 'Unit ID', 'Product', 'Action', 'Foreman', 'Note'],
    ticketsHeader: [
      'Ticket ID',
      'Status',
      'Foreman',
      'Project',
      'Opened At',
      'Closed At',
      'Closed By',
      'Total Units',
      'Pending Units',
      'Note',
    ],
    printsHeader: ['Created At', 'Unit ID', 'Product', 'Status', 'Requested By', 'Error'],
    periodLabels: {
      weekly: 'weekly',
      monthly: 'monthly',
      custom: 'custom',
    },
    filenamePrefix: 'zusim-report',
  },
};

const safeQuery = async (tag, queryFn, fallback) => {
  try {
    return await queryFn();
  } catch (err) {
    console.error(`[reports] ${tag} failed:`, err?.code || 'NO_CODE', err?.message || err);
    return fallback;
  }
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const getRange = (period, fromDate, toDate) => {
  const now = new Date();

  if (fromDate || toDate) {
    const from = fromDate ? new Date(fromDate) : addDays(now, -7);
    const to = toDate ? new Date(toDate) : now;
    return { from, to, label: 'custom' };
  }

  if (period === 'monthly') {
    return { from: addDays(now, -30), to: now, label: 'monthly' };
  }

  return { from: addDays(now, -7), to: now, label: 'weekly' };
};

const addHeaderRow = (sheet, headers) => {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAF1FF' },
    };
  });
};

const encodeDispositionFilename = (filename) =>
  encodeURIComponent(filename)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');

const toAsciiFilename = (filename) =>
  filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, '-');

router.get(
  '/export.xlsx',
  [
    query('period').optional().isIn(['weekly', 'monthly']),
    query('lang').optional().isIn(['pl', 'en']),
    query('product_id').optional().isInt({ min: 1 }),
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601(),
  ],
  validate,
  async (req, res) => {
    try {
      const period = req.query.period || 'weekly';
      const lang = req.query.lang === 'en' ? 'en' : 'pl';
      const tr = REPORT_I18N[lang];
      const productId = req.query.product_id ? parseInt(req.query.product_id, 10) : null;
      const fromDate = req.query.from_date;
      const toDate = req.query.to_date;
      const { from, to, label } = getRange(period, fromDate, toDate);
      const generatedAt = new Date();

      const ticketPeriodFilter = {
        OR: [{ opened_at: { gte: from, lte: to } }, { closed_at: { gte: from, lte: to } }],
      };

      const ticketFilter = productId
        ? {
            AND: [
              ticketPeriodFilter,
              {
                ticket_units: {
                  some: {
                    unit: {
                      product_id: productId,
                    },
                  },
                },
              },
            ],
          }
        : ticketPeriodFilter;

      const [selectedProduct, scans, tickets, printJobs, inCount, outCount, usedCount] = await Promise.all([
        productId
          ? safeQuery(
              'selected product',
              () =>
                prisma.product.findUnique({
                  where: { id: productId },
                  select: { name: true },
                }),
              null
            )
          : Promise.resolve(null),
        safeQuery(
          'scan logs',
          () =>
            prisma.scanEvent.findMany({
              where: {
                scanned_at: { gte: from, lte: to },
                ...(productId
                  ? {
                      unit: {
                        product_id: productId,
                      },
                    }
                  : {}),
              },
              orderBy: { scanned_at: 'asc' },
              include: {
                unit: {
                  select: {
                    id: true,
                    product: { select: { name: true } },
                  },
                },
                foreman: { select: { name: true } },
              },
            }),
          []
        ),
        safeQuery(
          'ticket logs',
          () =>
            prisma.ticket.findMany({
              where: ticketFilter,
              orderBy: { opened_at: 'asc' },
              include: {
                foreman: { select: { name: true } },
                project: { select: { name: true } },
                ticket_units: {
                  ...(productId
                    ? {
                        where: {
                          unit: {
                            product_id: productId,
                          },
                        },
                      }
                    : {}),
                  select: { id: true, returned: true },
                },
              },
            }),
          []
        ),
        safeQuery(
          'print logs',
          () =>
            prisma.printJob.findMany({
              where: {
                created_at: { gte: from, lte: to },
                ...(productId
                  ? {
                      unit: {
                        product_id: productId,
                      },
                    }
                  : {}),
              },
              orderBy: { created_at: 'asc' },
              include: {
                unit: {
                  select: {
                    id: true,
                    product: { select: { name: true } },
                  },
                },
              },
            }),
          []
        ),
        safeQuery('unit count IN', () => prisma.unit.count({ where: { status: 'IN', ...(productId ? { product_id: productId } : {}) } }), 0),
        safeQuery('unit count OUT', () => prisma.unit.count({ where: { status: 'OUT', ...(productId ? { product_id: productId } : {}) } }), 0),
        safeQuery('unit count USED', () => prisma.unit.count({ where: { status: 'USED', ...(productId ? { product_id: productId } : {}) } }), 0),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Zusim';
      workbook.created = new Date();

      const summarySheet = workbook.addWorksheet(tr.sheets.summary);
      addHeaderRow(summarySheet, tr.summaryHeader);
      summarySheet.addRows([
        [tr.summaryRows.period, tr.periodLabels[label] || label],
        [tr.summaryRows.from, from.toISOString()],
        [tr.summaryRows.to, to.toISOString()],
        [tr.summaryRows.generatedAt, generatedAt.toISOString()],
        [
          tr.summaryRows.product,
          selectedProduct?.name || (productId ? `#${productId}` : (lang === 'pl' ? 'Wszystkie produkty' : 'All products')),
        ],
        [tr.summaryRows.scanEvents, scans.length],
        [tr.summaryRows.ticketsInPeriod, tickets.length],
        [tr.summaryRows.printJobsInPeriod, printJobs.length],
        [tr.summaryRows.currentIn, inCount],
        [tr.summaryRows.currentOut, outCount],
        [tr.summaryRows.currentUsed, usedCount],
      ]);
      summarySheet.columns = [{ width: 36 }, { width: 24 }];

      const scansSheet = workbook.addWorksheet(tr.sheets.scans);
      addHeaderRow(scansSheet, tr.scansHeader);
      scans.forEach((event) => {
        scansSheet.addRow([
          event.scanned_at.toISOString(),
          event.unit_id,
          event.unit?.product?.name || '',
          event.action,
          event.foreman?.name || '',
          event.note || '',
        ]);
      });
      scansSheet.columns = [
        { width: 24 },
        { width: 18 },
        { width: 24 },
        { width: 12 },
        { width: 22 },
        { width: 42 },
      ];

      const ticketsSheet = workbook.addWorksheet(tr.sheets.tickets);
      addHeaderRow(ticketsSheet, tr.ticketsHeader);
      tickets.forEach((ticket) => {
        const totalUnits = ticket.ticket_units.length;
        const pendingUnits = ticket.ticket_units.filter((unit) => !unit.returned).length;

        ticketsSheet.addRow([
          ticket.id,
          ticket.status,
          ticket.foreman?.name || '',
          ticket.project?.name || '',
          ticket.opened_at ? ticket.opened_at.toISOString() : '',
          ticket.closed_at ? ticket.closed_at.toISOString() : '',
          ticket.closed_by || '',
          totalUnits,
          pendingUnits,
          ticket.note || '',
        ]);
      });
      ticketsSheet.columns = [
        { width: 12 },
        { width: 12 },
        { width: 20 },
        { width: 24 },
        { width: 24 },
        { width: 24 },
        { width: 16 },
        { width: 14 },
        { width: 14 },
        { width: 40 },
      ];

      const printSheet = workbook.addWorksheet(tr.sheets.prints);
      addHeaderRow(printSheet, tr.printsHeader);
      printJobs.forEach((job) => {
        printSheet.addRow([
          job.created_at.toISOString(),
          job.unit_id,
          job.unit?.product?.name || '',
          job.status,
          job.requested_by || '',
          job.error || '',
        ]);
      });
      printSheet.columns = [
        { width: 24 },
        { width: 18 },
        { width: 24 },
        { width: 12 },
        { width: 18 },
        { width: 48 },
      ];

      const safeFrom = from.toISOString().slice(0, 10);
      const safeTo = to.toISOString().slice(0, 10);
      const productSuffix = selectedProduct?.name
        ? `-${selectedProduct.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}`
        : '';
      const filename = `${tr.filenamePrefix}-${tr.periodLabels[label] || label}${productSuffix}-${safeFrom}-do-${safeTo}.xlsx`;
      const asciiFilename = toAsciiFilename(filename);
      const utf8Filename = encodeDispositionFilename(filename);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to export report.' });
    }
  }
);

module.exports = router;
