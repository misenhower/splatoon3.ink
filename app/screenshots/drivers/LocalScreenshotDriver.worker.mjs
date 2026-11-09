// Workers stand-in for #local-screenshot-driver: the local driver needs Chrome, puppeteer and
// an HTTP server, so it is kept out of the Worker bundle. Workers use the Cloudflare driver.
export default class LocalScreenshotDriver {
  async open() {
    throw new Error('Local screenshots are not available in Workers; use SCREENSHOT_PROVIDER=cloudflare');
  }

  async close() {}
}
