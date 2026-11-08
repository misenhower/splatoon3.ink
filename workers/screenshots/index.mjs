import CloudflareScreenshotDriver from '../../app/screenshots/drivers/CloudflareScreenshotDriver.mjs';
import { defaultScreenshotViewport } from '../../src/common/screenshot.mjs';

// Local capture-only entry point. The browser runs remotely; this endpoint stays on loopback.
export default {
  async fetch(request, env) {
    if (request.method !== 'GET') {
      return new Response('Use GET with a route query parameter.', {
        status: 405,
        headers: { Allow: 'GET' },
      });
    }

    let route = new URL(request.url).searchParams.get('route') || 'schedules';
    let driver = new CloudflareScreenshotDriver({ browser: env.BROWSER, env });

    try {
      await driver.open();

      let image = await driver.capture(route, defaultScreenshotViewport);

      return new Response(image, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error(error);

      return new Response(error.message, { status: 502 });
    } finally {
      await driver.close();
    }
  },
};
