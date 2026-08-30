import BrowserlessScreenshotDriver from './BrowserlessScreenshotDriver.mjs';
import CloudflareScreenshotDriver from './CloudflareScreenshotDriver.mjs';

export default function createScreenshotDriver(name, dependencies = {}) {
  if (name === 'browserless') {
    return new BrowserlessScreenshotDriver(dependencies);
  }

  if (name === 'cloudflare') {
    return new CloudflareScreenshotDriver(dependencies);
  }

  throw new Error('SCREENSHOT_PROVIDER must be "cloudflare" or "browserless"');
}
