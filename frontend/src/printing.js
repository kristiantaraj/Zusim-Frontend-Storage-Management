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

let browserPrintLoadPromise = null;

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-browserprint-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.browserprintSrc = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureBrowserPrintLoaded() {
  if (window.BrowserPrint) return;
  if (browserPrintLoadPromise) return browserPrintLoadPromise;

  const candidates = [
    'https://localhost:9101/BrowserPrint-3.1.250.min.js',
    'https://localhost:9101/BrowserPrint-3.0.216.min.js',
    'http://localhost:9100/BrowserPrint-3.1.250.min.js',
    'http://localhost:9100/BrowserPrint-3.0.216.min.js',
  ];

  browserPrintLoadPromise = (async () => {
    for (const src of candidates) {
      try {
        await injectScript(src);
        if (window.BrowserPrint) return;
      } catch {
        // Try next BrowserPrint SDK endpoint/version.
      }
    }
    throw new Error(
      'Zebra BrowserPrint SDK not loaded. Ensure Browser Print is installed and running, then allow localhost:9101/9100 access.'
    );
  })();

  return browserPrintLoadPromise;
}

/**
 * Send ZPL to a Zebra printer using the Browser Print SDK.
 * Requires window.BrowserPrint to be loaded.
 * @param {string} zpl
 * @returns {Promise<void>}
 */
export function printWithBrowserPrint(zpl) {
  return new Promise((resolve, reject) => {
    ensureBrowserPrintLoaded()
      .then(() => {
        window.BrowserPrint.getDefaultDevice(
          'printer',
          (device) => {
            if (!device) return reject(new Error('No default Zebra printer found.'));
            device.send(zpl, resolve, (err) => reject(new Error(`BrowserPrint error: ${err}`)));
          },
          (err) => reject(new Error(`BrowserPrint error: ${err}`))
        );
      })
      .catch((err) => reject(err));
  });
}
