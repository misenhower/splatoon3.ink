import { screenshotReadySelector } from '../../../src/common/screenshot.mjs';

export default class CloudflareScreenshotDriver
{
  _config = null;
  _env;
  _browser;

  constructor({ browser, env = process.env } = {}) {
    this._env = env;
    this._browser = browser;
  }

  async open() {
    if (!this._browser?.quickAction) {
      throw new Error('Cloudflare screenshots require a BROWSER binding; use npm run screenshot:cloudflare to test locally');
    }

    if (!this._env.SITE_URL) {
      throw new Error('Missing Cloudflare screenshot configuration: SITE_URL');
    }

    this._config = {
      siteUrl: this._env.SITE_URL,
    };
  }

  async capture(route, viewport) {
    let url = new URL('/screenshots/index.html', this._config.siteUrl);
    url.hash = route;

    // Match Splatoon 2's workaround for intermittent Browser Run timeouts.
    // Readiness still waits for the page's explicit data/fonts/images signal.
    let options = {
      url: url.toString(),
      viewport,
      cacheTTL: 0,
      gotoOptions: { waitUntil: 'domcontentloaded', timeout: 10_000 },
      waitForSelector: {
        selector: screenshotReadySelector,
        timeout: 10_000,
      },
      actionTimeout: 10_000,
      setExtraHTTPHeaders: { 'Cache-Control': 'no-cache' },
      screenshotOptions: { type: 'png' },
    };

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        let response = await this._browser.quickAction('screenshot', options);

        if (!response.ok) {
          let message = await this._errorMessage(response);
          let error = new Error(`Cloudflare Browser Run screenshot failed (${response.status}): ${message}`);

          // Browser Run reports navigation/selector/action timeouts as HTTP 422.
          error.retryable = response.status === 408
            || response.status >= 500
            || (response.status === 422 && /timeout|timed out/i.test(message));

          throw error;
        }

        return new Uint8Array(await response.arrayBuffer());
      } catch (error) {
        let retryable = error.retryable ?? ['TimeoutError', 'TypeError'].includes(error.name);

        if (!retryable || attempt === 3) {
          throw error;
        }

        let delayMs = 500 * 2 ** attempt;

        console.warn('Retrying Browser Run screenshot', {
          attempt: attempt + 1,
          delayMs,
          error: error.message,
        });

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  async _errorMessage(response) {
    let body = await response.text();

    try {
      let result = JSON.parse(body);
      let messages = result.errors?.map(error => error.message).filter(Boolean);
      if (messages?.length) {
        return messages.join('; ');
      }
    } catch {
      // Use the response body as-is when Cloudflare does not return JSON.
    }

    return body || response.statusText || 'Unknown error';
  }

  async close() {
    this._config = null;
  }
}
