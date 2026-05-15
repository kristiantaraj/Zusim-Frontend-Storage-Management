const express = require('express');
const prisma = require('../db');

const router = express.Router();

const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const safeQuery = async (queryFn, fallback) => {
  try {
    return await queryFn();
  } catch (err) {
    console.error('[dashboard] query failed:', err?.code || 'NO_CODE', err?.message || err);
    if (typeof fallback === 'function') return fallback(err);
    return fallback;
  }
};

// GET /dashboard - summary counts + alerts + insights
router.get('/', async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);

    const [
      totalProducts,
      totalBatches,
      totalUnits,
      inCount,
      outCount,
      usedCount,
      recentScans,
      staleOutUnits,
      longOpenTickets,
      lowStock,
      issuedThisWeek,
      returnedThisWeek,
      usedThisWeek,
      issuedPrevWeek,
      returnedPrevWeek,
      usedPrevWeek,
      topProducts,
      foremanActivity,
      projectActivity,
    ] = await Promise.all([
      safeQuery(() => prisma.product.count({ where: { is_active: true } }), () => prisma.product.count()),
      safeQuery(() => prisma.batch.count(), 0),
      safeQuery(() => prisma.unit.count(), 0),
      safeQuery(() => prisma.unit.count({ where: { status: 'IN' } }), 0),
      safeQuery(() => prisma.unit.count({ where: { status: 'OUT' } }), 0),
      safeQuery(() => prisma.unit.count({ where: { status: 'USED' } }), 0),
      safeQuery(() => prisma.scanEvent.findMany({
        take: 10,
        orderBy: { scanned_at: 'desc' },
        include: {
          unit: { include: { product: { select: { name: true } } } },
        },
      }), []),
      safeQuery(() => prisma.unit.findMany({
        where: { status: 'OUT', updated_at: { lte: daysAgo(5) } },
        take: 20,
        orderBy: { updated_at: 'asc' },
        include: { product: { select: { name: true } } },
      }), []),
      safeQuery(() => prisma.ticket.findMany({
        where: { status: 'OPEN', opened_at: { lte: daysAgo(3) } },
        take: 20,
        orderBy: { opened_at: 'asc' },
        include: {
          foreman: { select: { name: true, icon: true } },
          project: { select: { name: true } },
          ticket_units: { select: { id: true, returned: true } },
        },
      }), []),
      safeQuery(() => prisma.product.findMany({
        where: { is_active: true },
        include: {
          units: {
            where: { status: 'IN' },
            select: { id: true },
          },
        },
      }), () =>
        prisma.product.findMany({
          include: {
            units: {
              where: { status: 'IN' },
              select: { id: true },
            },
          },
        })),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'OUT', scanned_at: { gte: sevenDaysAgo, lte: now } } }), 0),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'IN', scanned_at: { gte: sevenDaysAgo, lte: now } } }), 0),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'USED', scanned_at: { gte: sevenDaysAgo, lte: now } } }), 0),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'OUT', scanned_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }), 0),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'IN', scanned_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }), 0),
      safeQuery(() => prisma.scanEvent.count({ where: { action: 'USED', scanned_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }), 0),
      safeQuery(() => prisma.scanEvent.groupBy({
        by: ['unit_id'],
        where: { action: 'OUT', scanned_at: { gte: sevenDaysAgo, lte: now } },
        _count: { unit_id: true },
        orderBy: { _count: { unit_id: 'desc' } },
        take: 30,
      }), []),
      safeQuery(() => prisma.ticket.groupBy({
        by: ['foreman_id'],
        where: { opened_at: { gte: sevenDaysAgo, lte: now } },
        _count: { foreman_id: true },
        orderBy: { _count: { foreman_id: 'desc' } },
        take: 8,
      }), []),
      safeQuery(() => prisma.ticket.groupBy({
        by: ['project_id'],
        where: { opened_at: { gte: sevenDaysAgo, lte: now } },
        _count: { project_id: true },
        orderBy: { _count: { project_id: 'desc' } },
        take: 8,
      }), []),
    ]);

    const topProductUnitIds = topProducts.map((x) => x.unit_id);
    const unitMeta = topProductUnitIds.length
      ? await prisma.unit.findMany({
          where: { id: { in: topProductUnitIds } },
          include: { product: { select: { id: true, name: true } } },
        })
      : [];
    const unitMetaMap = new Map(unitMeta.map((u) => [u.id, u.product?.name || 'Unknown']));

    const foremanIds = foremanActivity.map((x) => x.foreman_id);
    const foremen = foremanIds.length
      ? await prisma.foreman.findMany({ where: { id: { in: foremanIds } }, select: { id: true, name: true, icon: true } })
      : [];
    const foremanMap = new Map(foremen.map((f) => [f.id, f]));

    const projectIds = projectActivity.map((x) => x.project_id);
    const projects = projectIds.length
      ? await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
      : [];
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    res.json({
      totalProducts,
      totalBatches,
      totalUnits,
      inCount,
      outCount,
      usedCount,
      recentScans,
      alerts: {
        staleOutUnits: staleOutUnits.map((u) => ({
          id: u.id,
          product: u.product?.name || null,
          since: u.updated_at,
        })),
        longOpenTickets: longOpenTickets.map((t) => ({
          id: t.id,
          opened_at: t.opened_at,
          foreman: t.foreman,
          project: t.project,
          pending_units: t.ticket_units.filter((u) => !u.returned).length,
        })),
        lowStockProducts: lowStock
          .filter((p) => p.units.length <= 3)
          .map((p) => ({ id: p.id, name: p.name, in_stock: p.units.length })),
      },
      trends: {
        issued: {
          thisWeek: issuedThisWeek,
          prevWeek: issuedPrevWeek,
          delta: issuedThisWeek - issuedPrevWeek,
        },
        returned: {
          thisWeek: returnedThisWeek,
          prevWeek: returnedPrevWeek,
          delta: returnedThisWeek - returnedPrevWeek,
        },
        used: {
          thisWeek: usedThisWeek,
          prevWeek: usedPrevWeek,
          delta: usedThisWeek - usedPrevWeek,
        },
      },
      insights: {
        topProducts: topProducts
          .map((x) => ({
            product: unitMetaMap.get(x.unit_id) || 'Unknown',
            count: x._count.unit_id,
          }))
          .slice(0, 8),
        foremen: foremanActivity.map((x) => ({
          id: x.foreman_id,
          name: foremanMap.get(x.foreman_id)?.name || 'Unknown',
          icon: foremanMap.get(x.foreman_id)?.icon || null,
          tickets: x._count.foreman_id,
        })),
        projects: projectActivity.map((x) => ({
          id: x.project_id,
          name: projectMap.get(x.project_id) || 'Unknown',
          tickets: x._count.project_id,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
