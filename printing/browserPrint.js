/**
 * Zebra Browser Print implementation.
 *
 * Requires the Zebra BrowserPrint SDK to be loaded on the page:
 *   <script src="https://zebra.com/apps/browserprint/BrowserPrint-3.1.250.min.js"></script>
 *
 * The SDK exposes window.BrowserPrint global.
 */

/**
 * Get the default Zebra printer via Browser Print.
 * @returns {Promise<object>} BrowserPrint device
 */
function getDefaultPrinter() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.BrowserPrint) {
      return reject(new Error('Zebra BrowserPrint SDK not loaded. Add the script tag to index.html.'));
    }
    window.BrowserPrint.getDefaultDevice(
      'printer',
      (device) => {
        if (!device) return reject(new Error('No default Zebra printer found.'));
        resolve(device);
      },
      (err) => reject(new Error(`BrowserPrint error: ${err}`))
    );
  });
}

/**
 * Send a ZPL string to the default Zebra printer via Browser Print.
 * @param {string} zplString
 * @returns {Promise<void>}
 */
async function printWithBrowserPrint(zplString) {
  const device = await getDefaultPrinter();
  return new Promise((resolve, reject) => {
    device.send(
      zplString,
      () => resolve(),
      (err) => reject(new Error(`BrowserPrint send error: ${err}`))
    );
  });
}

export { printWithBrowserPrint, getDefaultPrinter };
