import CloudflareScreenshotDriver from './CloudflareScreenshotDriver.mjs';
import LocalScreenshotDriver from './LocalScreenshotDriver.mjs';

export default function createScreenshotDriver(name, dependencies = {}) {
  if (name === 'local') {
    return new LocalScreenshotDriver(dependencies);
  }

  if (name === 'cloudflare') {
    return new CloudflareScreenshotDriver(dependencies);
  }

  throw new Error('SCREENSHOT_PROVIDER must be "cloudflare" or "local"');
}
