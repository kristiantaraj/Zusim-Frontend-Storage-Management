/**
 * Abstract printing layer.
 *
 * Two implementations are provided:
 *   1. Zebra Browser Print  - uses the native BrowserPrint SDK (CDN script)
 *   2. QZ Tray              - uses the qz-tray npm package / browser library
 *
 * Usage (in React / browser code):
 *
 *   import { printWithBrowserPrint } from './printing/browserPrint';
 *   import { printWithQzTray }       from './printing/qzTray';
 *
 *   // or use the unified wrapper:
 *   import { printLabel }            from './printing/printService';
 */

// ─── Unified wrapper ──────────────────────────────────────────────────────────

/**
 * Print a ZPL string using whichever backend is configured.
 * Set window.__PRINT_BACKEND__ = 'qz' | 'browser-print' (defaults to 'browser-print').
 *
 * @param {string} zplString
 * @returns {Promise<void>}
 */
async function printLabel(zplString) {
  const backend =
    (typeof window !== 'undefined' && window.__PRINT_BACKEND__) || 'browser-print';

  if (backend === 'qz') {
    const { printWithQzTray } = await import('./qzTray.js');
    return printWithQzTray(zplString);
  } else {
    const { printWithBrowserPrint } = await import('./browserPrint.js');
    return printWithBrowserPrint(zplString);
  }
}

module.exports = { printLabel };
