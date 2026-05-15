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

    const safeTopProducts = Array.isArray(topProducts) ? topProducts : [];
    const safeForemanActivity = Array.isArray(foremanActivity) ? foremanActivity : [];
    const safeProjectActivity = Array.isArray(projectActivity) ? projectActivity : [];
    const safeStaleOutUnits = Array.isArray(staleOutUnits) ? staleOutUnits : [];
    const safeLongOpenTickets = Array.isArray(longOpenTickets) ? longOpenTickets : [];
    const safeLowStock = Array.isArray(lowStock) ? lowStock : [];
    const safeRecentScans = Array.isArray(recentScans) ? recentScans : [];

    const topProductUnitIds = safeTopProducts.map((x) => x.unit_id).filter(Boolean);
    const unitMeta = topProductUnitIds.length
      ? await safeQuery(
          () =>
            prisma.unit.findMany({
              where: { id: { in: topProductUnitIds } },
              include: { product: { select: { id: true, name: true } } },
            }),
          []
        )
      : [];
    const unitMetaMap = new Map(unitMeta.map((u) => [u.id, u.product?.name || 'Unknown']));

    const foremanIds = safeForemanActivity.map((x) => x.foreman_id).filter((id) => id !== null && id !== undefined);
    const foremen = foremanIds.length
      ? await safeQuery(
          () => prisma.foreman.findMany({ where: { id: { in: foremanIds } }, select: { id: true, name: true, icon: true } }),
          []
        )
      : [];
    const foremanMap = new Map(foremen.map((f) => [f.id, f]));

    const projectIds = safeProjectActivity.map((x) => x.project_id).filter((id) => id !== null && id !== undefined);
    const projects = projectIds.length
      ? await safeQuery(
          () => prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }),
          []
        )
      : [];
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    res.json({
      totalProducts,
      totalBatches,
      totalUnits,
      inCount,
      outCount,
      usedCount,
      recentScans: safeRecentScans,
      alerts: {
        staleOutUnits: safeStaleOutUnits.map((u) => ({
          id: u.id,
          product: u.product?.name || null,
          since: u.updated_at,
        })),
        longOpenTickets: safeLongOpenTickets.map((t) => ({
          id: t.id,
          opened_at: t.opened_at,
          foreman: t.foreman,
          project: t.project,
          pending_units: Array.isArray(t.ticket_units) ? t.ticket_units.filter((u) => !u.returned).length : 0,
        })),
        lowStockProducts: safeLowStock
          .filter((p) => Array.isArray(p.units) && p.units.length <= 3)
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
        topProducts: safeTopProducts
          .map((x) => ({
            product: unitMetaMap.get(x.unit_id) || 'Unknown',
            count: x._count?.unit_id || 0,
          }))
          .slice(0, 8),
        foremen: safeForemanActivity.map((x) => ({
          id: x.foreman_id,
          name: foremanMap.get(x.foreman_id)?.name || 'Unknown',
          icon: foremanMap.get(x.foreman_id)?.icon || null,
          tickets: x._count?.foreman_id || 0,
        })),
        projects: safeProjectActivity.map((x) => ({
          id: x.project_id,
          name: projectMap.get(x.project_id) || 'Unknown',
          tickets: x._count?.project_id || 0,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
