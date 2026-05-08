const prisma = require('../db');

/**
 * Generate a sequential unit ID in format HP-{YEAR}-{6_DIGIT_NUMBER}
 * Uses a database counter to ensure uniqueness under concurrent requests.
 * @param {number} year - 4-digit year
 * @returns {Promise<string>} - e.g. "HP-2026-000001"
 */
async function generateUnitId(year) {
  // Atomically increment the counter for this year
  const counter = await prisma.idCounter.upsert({
    where: { year },
    update: { count: { increment: 1 } },
    create: { year, count: 1 },
  });

  const padded = String(counter.count).padStart(6, '0');
  return `HP-${year}-${padded}`;
}

/**
 * Generate N unique unit IDs for the given year.
 * Each call is sequential so IDs are never duplicated.
 * @param {number} count
 * @param {number} [year]
 * @returns {Promise<string[]>}
 */
async function generateUnitIds(count, year) {
  const targetYear = year ?? new Date().getFullYear();
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push(await generateUnitId(targetYear));
  }
  return ids;
}

module.exports = { generateUnitId, generateUnitIds };
