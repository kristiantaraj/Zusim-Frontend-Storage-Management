/**
 * ZPL generation (mirrors the backend printing/zplGenerator.js but runs in browser).
 */
export function generateZpl({
  unitId,
  productName = '',
  batchDate = '',
  labelWidthMm = 100,
  labelHeightMm = 150,
}) {
  const mmToDots = (mm) => Math.round(mm * 8); // 203dpi ~= 8 dots/mm
  const clampMm = (value, min, max, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  };

  const safeWidthMm = clampMm(labelWidthMm, 30, 200, 100);
  const safeHeightMm = clampMm(labelHeightMm, 30, 300, 150);

  const widthDots = mmToDots(safeWidthMm);
  const heightDots = mmToDots(safeHeightMm);

  const baseWidth = 800;
  const baseHeight = 400;
  const scaleX = widthDots / baseWidth;
  const scaleY = heightDots / baseHeight;
  const scale = Math.min(scaleX, scaleY);

  const x = (value) => Math.max(0, Math.round(value * scaleX));
  const y = (value) => Math.max(0, Math.round(value * scaleY));
  const sz = (value) => Math.max(14, Math.round(value * scale));

  const safeId = unitId.replace(/[^A-Za-z0-9\-]/g, '');
  const safeName = productName.substring(0, 30).replace(/[^A-Za-z0-9 \-\.]/g, '');
  const safeDate = batchDate.substring(0, 20).replace(/[^A-Za-z0-9 \-\/]/g, '');
  const qrModule = Math.max(4, Math.min(10, Math.round(6 * scale)));

  return [
    '^XA',
    `^PW${widthDots}`,
    `^LL${heightDots}`,
    `^FO${x(30)},${y(30)}^A0N,${sz(50)},${sz(50)}`,
    `^FD${safeId}^FS`,
    ...(safeName ? [`^FO${x(30)},${y(90)}^A0N,${sz(28)},${sz(28)}^FD${safeName}^FS`] : []),
    ...(safeDate ? [`^FO${x(30)},${y(125)}^A0N,${sz(22)},${sz(22)}^FDBatch: ${safeDate}^FS`] : []),
    `^FO${x(460)},${y(20)}`,
    `^BQN,2,${qrModule}`,
    `^FDQA,${safeId}^FS`,
    `^FO${x(20)},${y(175)}^GB${Math.max(1, x(760))},${Math.max(1, sz(3))},${Math.max(1, sz(3))}^FS`,
    '^XZ',
  ].join('\n');
}

export function generateBatchZpl(units, labelConfig = {}) {
  return units.map((u) => generateZpl({ ...u, ...labelConfig })).join('\n');
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
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalHost) {
    throw new Error(
      'Browser security blocked access to local Browser Print service from an insecure HTTP site. Open this app via HTTPS (recommended) or run it locally on localhost.'
    );
  }

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
