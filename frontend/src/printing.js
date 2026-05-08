/**
 * ZPL generation (mirrors the backend printing/zplGenerator.js but runs in browser).
 */
export function generateZpl({ unitId, productName = '', batchDate = '' }) {
  const safeId = unitId.replace(/[^A-Za-z0-9\-]/g, '');
  const safeName = productName.substring(0, 30).replace(/[^A-Za-z0-9 \-\.]/g, '');
  const safeDate = batchDate.substring(0, 20).replace(/[^A-Za-z0-9 \-\/]/g, '');

  return [
    '^XA',
    '^FO30,30^A0N,50,50',
    `^FD${safeId}^FS`,
    ...(safeName ? [`^FO30,90^A0N,28,28^FD${safeName}^FS`] : []),
    ...(safeDate ? [`^FO30,125^A0N,22,22^FDBatch: ${safeDate}^FS`] : []),
    '^FO460,20',
    '^BQN,2,6',
    `^FDQA,${safeId}^FS`,
    '^FO20,175^GB760,3,3^FS',
    '^XZ',
  ].join('\n');
}

export function generateBatchZpl(units) {
  return units.map((u) => generateZpl(u)).join('\n');
}

/**
 * Send ZPL to a Zebra printer using the Browser Print SDK.
 * Requires window.BrowserPrint to be loaded.
 * @param {string} zpl
 * @returns {Promise<void>}
 */
export function printWithBrowserPrint(zpl) {
  return new Promise((resolve, reject) => {
    if (!window.BrowserPrint) {
      return reject(
        new Error(
          'Zebra BrowserPrint SDK not loaded. Add the <script> tag for BrowserPrint to index.html.'
        )
      );
    }
    window.BrowserPrint.getDefaultDevice('printer', (device) => {
      if (!device) return reject(new Error('No default Zebra printer found.'));
      device.send(zpl, resolve, (err) => reject(new Error(`BrowserPrint error: ${err}`)));
    }, (err) => reject(new Error(`BrowserPrint error: ${err}`)));
  });
}
