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
    `^FO${x(30)},${y(160)}^BY${Math.max(2, Math.round(scaleX * 2))},${Math.max(1, Math.round(2 * scale))},${Math.max(30, Math.round(80 * scaleY))}`,
    `^BCN,${Math.max(30, Math.round(80 * scaleY))},Y,N,N`,
    `^FD${safeId}^FS`,
    `^FO${x(460)},${y(20)}`,
    `^BQN,2,${qrModule}`,
    `^FDQA,${safeId}^FS`,
    `^FO${x(20)},${y(280)}^GB${Math.max(1, x(760))},${Math.max(1, sz(3))},${Math.max(1, sz(3))}^FS`,
    '^XZ',
  ].join('\n');
}

export function generateBatchZpl(units, labelConfig = {}) {
  return units.map((u) => generateZpl({ ...u, ...labelConfig })).join('\n');
}

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];
const LOCAL_BROWSERPRINT_SCRIPT_URLS = [
  'https://localhost:9101/BrowserPrint-3.1.250.min.js',
  'https://localhost:9101/BrowserPrint-3.0.216.min.js',
  'http://localhost:9100/BrowserPrint-3.1.250.min.js',
  'http://localhost:9100/BrowserPrint-3.0.216.min.js',
];

let browserPrintInitPromise = null;

const isLocalhostRuntime = () => LOCAL_HOSTNAMES.includes(window.location.hostname);

function toFriendlyBrowserPrintError(error, fallbackMessage) {
  const message = String(error?.message || error || '');
  const lower = message.toLowerCase();
  if (
    lower.includes('more-private address space') ||
    lower.includes('private network access') ||
    lower.includes('network_access_denied') ||
    lower.includes('err_failed') ||
    lower.includes('failed to fetch')
  ) {
    return new Error(
      'Chrome blocked Local Network Access to Zebra Browser Print. Open the app over HTTPS, then allow local network access for this site in Chrome Site Settings.'
    );
  }
  return new Error(fallbackMessage || message || 'Browser Print request failed.');
}

async function injectBrowserPrintScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-browserprint-src="${src}"]`);
    if (existing) {
      if (window.BrowserPrint) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed loading ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.browserprintSrc = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed loading ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureBrowserPrintSdk() {
  if (window.BrowserPrint) return true;

  for (const src of LOCAL_BROWSERPRINT_SCRIPT_URLS) {
    try {
      console.log('[BrowserPrint] Attempting SDK load from', src);
      await injectBrowserPrintScript(src);
      if (window.BrowserPrint) {
        console.log('[BrowserPrint] SDK loaded from', src);
        return true;
      }
    } catch (error) {
      console.warn('[BrowserPrint] SDK load failed from', src, error);
    }
  }

  console.warn('[BrowserPrint] SDK global unavailable, will try direct local API fallback');
  return false;
}

function initializeBrowserPrint() {
  if (window.zebraPrinter) {
    console.log('[BrowserPrint] Reusing cached printer', window.zebraPrinter);
    return Promise.resolve(window.zebraPrinter);
  }

  if (browserPrintInitPromise) return browserPrintInitPromise;

  browserPrintInitPromise = new Promise((resolve, reject) => {
    if (!window.BrowserPrint) {
      reject(new Error('BrowserPrint SDK is not available in this page.'));
      return;
    }

    console.log('[BrowserPrint] Initializing BrowserPrint.getDefaultDevice(...)');
    window.BrowserPrint.getDefaultDevice(
      'printer',
      function(printer) {
        window.zebraPrinter = printer;
        console.log('Printer found:', printer);
        resolve(printer);
      },
      function(error) {
        console.error('BrowserPrint error:', error);
        reject(toFriendlyBrowserPrintError(error, `BrowserPrint initialization failed: ${String(error)}`));
      }
    );
  }).catch((error) => {
    browserPrintInitPromise = null;
    throw error;
  });

  return browserPrintInitPromise;
}

async function printWithBrowserPrintSdk(zpl) {
  const printer = await initializeBrowserPrint();

  console.log('[BrowserPrint] Sending ZPL using BrowserPrint SDK', {
    zplLength: zpl.length,
    printerName: printer?.name || printer?.uid || 'unknown',
  });

  return new Promise((resolve, reject) => {
    printer.send(
      zpl,
      () => {
        console.log('[BrowserPrint] SDK send completed successfully');
        resolve();
      },
      (error) => {
        console.error('[BrowserPrint] SDK send failed', error);
        reject(toFriendlyBrowserPrintError(error, `BrowserPrint send error: ${String(error)}`));
      }
    );
  });
}

async function fetchAvailableLocalPrinters() {
  const endpoints = ['http://localhost:9100/available', 'https://localhost:9101/available'];

  for (const endpoint of endpoints) {
    try {
      console.log('[BrowserPrint] Checking local printers via', endpoint);
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      const printers = Array.isArray(data?.printer) ? data.printer : [];
      if (printers.length) {
        console.log('[BrowserPrint] Local printers discovered', printers);
        return printers;
      }
    } catch (error) {
      console.warn('[BrowserPrint] Local printer discovery failed for', endpoint, error);
    }
  }

  return [];
}

async function printWithLocalBrowserPrintApi(zpl) {
  console.log('[BrowserPrint] Using direct local Browser Print API fallback', {
    origin: window.location.origin,
    secureContext: window.isSecureContext,
    isLocalhost: isLocalhostRuntime(),
    zplLength: zpl.length,
  });

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
      console.log('[BrowserPrint] Sending ZPL via local endpoint', endpoint);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        lastError = new Error(`Browser Print write failed: HTTP ${res.status}`);
        console.warn('[BrowserPrint] Local write endpoint failed', endpoint, res.status);
        continue;
      }

      console.log('[BrowserPrint] Local write succeeded via', endpoint);
      return;
    } catch (err) {
      lastError = err;
      console.warn('[BrowserPrint] Local write threw error', endpoint, err);
    }
  }

  throw toFriendlyBrowserPrintError(lastError, 'Browser Print local write failed.');
}

/**
 * Send ZPL to a Zebra printer using the Browser Print SDK.
 * Requires window.BrowserPrint to be loaded.
 * @param {string} zpl
 * @returns {Promise<void>}
 */
export function printWithBrowserPrint(zpl) {
  return new Promise((resolve, reject) => {
    console.log('[BrowserPrint] Print requested', {
      origin: window.location.origin,
      secureContext: window.isSecureContext,
      isLocalhost: isLocalhostRuntime(),
      zplLength: zpl.length,
    });

    ensureBrowserPrintSdk()
      .then((hasSdk) => (hasSdk ? printWithBrowserPrintSdk(zpl) : printWithLocalBrowserPrintApi(zpl)))
      .then(() => {
        console.log('[BrowserPrint] Print flow completed');
        resolve();
      })
      .catch((error) => {
        console.error('[BrowserPrint] Print flow failed', error);
        reject(toFriendlyBrowserPrintError(error, error?.message));
      });
  });
}
