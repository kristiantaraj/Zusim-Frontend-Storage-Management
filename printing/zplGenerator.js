/**
 * ZPL (Zebra Programming Language) label generator for paint bucket units.
 * Produces a label with: large unit ID text, QR code, and product name.
 *
 * Label size defaults to 4" x 2" (800 x 400 dots at 203 DPI).
 */

/**
 * Generate a ZPL string for a single unit label.
 * @param {object} options
 * @param {string} options.unitId      - e.g. "HP-2026-000001"
 * @param {string} [options.productName] - e.g. "Dulux White 15L"
 * @param {string} [options.batchDate]   - e.g. "2026-04-27"
 * @returns {string} ZPL command string
 */
function generateZpl({ unitId, productName = '', batchDate = '' }) {
  const safeId = unitId.replace(/[^A-Za-z0-9\-]/g, '');
  const safeName = productName.substring(0, 30).replace(/[^A-Za-z0-9 \-\.]/g, '');
  const safeDate = batchDate.substring(0, 20).replace(/[^A-Za-z0-9 \-\/]/g, '');

  return [
    '^XA',
    '^CF0,35',              // Default font size

    // Unit ID - large, prominent
    '^FO30,30^A0N,50,50',
    `^FD${safeId}^FS`,

    // Product name line (if provided)
    ...(safeName
      ? [`^FO30,90^A0N,28,28^FD${safeName}^FS`]
      : []),

    // Batch date line (if provided)
    ...(safeDate
      ? [`^FO30,125^A0N,22,22^FDBatch: ${safeDate}^FS`]
      : []),

    // QR Code - encodes the unit ID
    '^FO460,20',
    '^BQN,2,6',
    `^FDQA,${safeId}^FS`,

    // Bottom border line
    '^FO20,175^GB760,3,3^FS',

    '^XZ',
  ].join('\n');
}

/**
 * Generate ZPL for multiple units (batch print).
 * @param {Array<{unitId: string, productName?: string, batchDate?: string}>} units
 * @returns {string} Concatenated ZPL for all labels
 */
function generateBatchZpl(units) {
  return units.map((u) => generateZpl(u)).join('\n');
}

module.exports = { generateZpl, generateBatchZpl };
