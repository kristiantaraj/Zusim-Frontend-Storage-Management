/**
 * QZ Tray printing implementation.
 *
 * Requires QZ Tray desktop application installed on the client machine.
 * Include the qz-tray library:
 *   npm install qz-tray
 *   OR via CDN: <script src="https://cdn.qz.io/qz-tray/2.2.4/qz-tray.js"></script>
 *
 * QZ Tray must be running on the client machine and trusted (certificate or unsigned mode).
 */
import qz from 'qz-tray';

let connected = false;

/**
 * Connect to QZ Tray if not already connected.
 * @returns {Promise<void>}
 */
async function ensureConnected() {
  if (connected && qz.websocket.isActive()) return;
  await qz.websocket.connect();
  connected = true;
}

/**
 * Disconnect from QZ Tray.
 */
async function disconnect() {
  if (connected && qz.websocket.isActive()) {
    await qz.websocket.disconnect();
    connected = false;
  }
}

/**
 * Send a ZPL string to a Zebra printer via QZ Tray.
 * @param {string} zplString
 * @param {string} [printerName] - Printer name as it appears in the OS. If omitted, uses the default.
 * @returns {Promise<void>}
 */
async function printWithQzTray(zplString, printerName) {
  await ensureConnected();

  const printer = printerName || (await qz.printers.getDefault());

  const config = qz.configs.create(printer, {
    encoding: 'UTF-8',
    language: 'ZPL',
  });

  const data = [{ type: 'raw', format: 'plain', data: zplString }];

  await qz.print(config, data);
}

export { printWithQzTray, ensureConnected, disconnect };
