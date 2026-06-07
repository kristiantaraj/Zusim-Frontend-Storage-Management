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

async function fetchAvailableLocalPrinters() {
  const endpoints = ['http://localhost:9100/available', 'https://localhost:9101/available'];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      const printers = Array.isArray(data?.printer) ? data.printer : [];
      if (printers.length) return printers;
    } catch {
      // Try next endpoint.
    }
  }

  return [];
}

async function printWithLocalBrowserPrintApi(zpl) {
  const printers = await fetchAvailableLocalPrinters();
  if (!printers.length) {
    throw new Error(
      'No local Browser Print printers found. Ensure Zebra Browser Print is running and the printer is connected.'
    );
  }

  const payload = {
    device: printers[0],
    data: zpl,
  };

  const writeEndpoints = ['http://localhost:9100/write', 'https://localhost:9101/write'];
  let lastError = null;

  for (const endpoint of writeEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        lastError = new Error(`Browser Print write failed: HTTP ${res.status}`);
        continue;
      }

      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Browser Print write failed.');
}

/**
 * Send ZPL to a Zebra printer using the Browser Print SDK.
 * Requires window.BrowserPrint to be loaded.
 * @param {string} zpl
 * @returns {Promise<void>}
 */
export function printWithBrowserPrint(zpl) {
  return new Promise((resolve, reject) => {
    // Preferred: SDK global if available.
    if (window.BrowserPrint) {
      window.BrowserPrint.getDefaultDevice(
        'printer',
        (device) => {
          if (!device) return reject(new Error('No default Zebra printer found.'));
          device.send(zpl, resolve, (err) => reject(new Error(`BrowserPrint error: ${err}`)));
        },
        (err) => reject(new Error(`BrowserPrint error: ${err}`))
      );
      return;
    }

    // Fallback: direct local Browser Print service API.
    printWithLocalBrowserPrintApi(zpl)
      .then(() => resolve())
      .catch((err) => reject(new Error(`BrowserPrint not ready: ${err.message}`)));
  });
}
