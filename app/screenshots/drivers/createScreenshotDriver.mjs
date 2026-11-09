import CloudflareScreenshotDriver from './CloudflareScreenshotDriver.mjs';
// A package import keeps puppeteer and Chrome out of the Worker bundle.
import LocalScreenshotDriver from '#local-screenshot-driver';

export default function createScreenshotDriver(name, dependencies = {}) {
  if (name === 'local') {
    return new LocalScreenshotDriver(dependencies);
  }

  if (name === 'cloudflare') {
    return new CloudflareScreenshotDriver(dependencies);
  }

  throw new Error('SCREENSHOT_PROVIDER must be "cloudflare" or "local"');
}
