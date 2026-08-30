import { URL } from 'url';
import puppeteer from 'puppeteer-core';
import HttpServer from './HttpServer.mjs';

const defaultViewport = {
  // Using a 16:9 ratio here by default to match Twitter's image card dimensions
  width: 1200,
  height: 675,
  deviceScaleFactor: 2,
};

export default class ScreenshotHelper
{
  _provider = null;
  _fetch;
  /** @type {HttpServer} */
  _httpServer = null;
  /** @type {puppeteer.Browser} */
  _browser = null;
  /** @type {puppeteer.Page} */
  _page = null;

  defaultParams = null;

  constructor({ fetch = globalThis.fetch } = {}) {
    this._fetch = fetch;
  }

  get isOpen() {
    return !!this._provider;
  }

  /** @type {puppeteer.Page} */
  get page() {
    return this._page;
  }

  async open() {
    await this.close();

    let provider = process.env.SCREENSHOT_PROVIDER;

    if (provider === 'cloudflare') {
      this._requireConfiguration([
        'SITE_URL',
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_BROWSER_RUN_API_TOKEN',
      ], 'Cloudflare screenshot');
      this._provider = provider;
      return;
    }

    if (provider !== 'browserless') {
      throw new Error('SCREENSHOT_PROVIDER must be "cloudflare" or "browserless"');
    }

    this._requireConfiguration(['BROWSERLESS_ENDPOINT'], 'Browserless screenshot');
    this._provider = provider;

    // Start the HTTP server
    this._httpServer = new HttpServer;
    await this._httpServer.open();

    // Connect to Browserless
    this._browser = await puppeteer.connect({
      browserWSEndpoint: process.env.BROWSERLESS_ENDPOINT,
    });

    // Create a new page and set the viewport
    this._page = await this._browser.newPage();
    await this.applyViewport();
  }

  _requireConfiguration(names, label) {
    let missing = names.filter(name => !process.env[name]);
    if (missing.length) {
      throw new Error(`Missing ${label} configuration: ${missing.join(', ')}`);
    }
  }

  async applyViewport(viewport = {}) {
    if (this._page) {
      await this._page.setViewport({
        ...defaultViewport,
        ...viewport,
      });
    }
  }

  async capture(path, options = {}) {
    if (!this.isOpen) {
      await this.open();
    }

    // Navigate to the URL
    let url;
    if (this._provider === 'cloudflare') {
      url = new URL('/screenshots/', process.env.SITE_URL);
    } else {
      let host = process.env.SCREENSHOT_HOST || 'localhost';
      url = new URL(`http://${host}:${this._httpServer.port}/screenshots/`);
    }
    url.hash = path;

    let params = {
      ...this.defaultParams,
      ...options.params,
    };

    if (params) {
      // We can't use url.searchParams because they need to come after the hash
      url.hash += '?';
      url.hash += Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
    }

    let viewport = {
      ...defaultViewport,
      ...options.viewport,
    };

    if (this._provider === 'cloudflare') {
      return await this._captureCloudflare(url, viewport);
    }

    await this.applyViewport(viewport);

    await this._page.goto(url, {
      waitUntil: 'networkidle0', // Wait until the network is idle
    });

    // Wait an additional 1000ms
    await this._page.waitForNetworkIdle({ idleTime: 1000 });

    // Take the screenshot
    return await this._page.screenshot();
  }

  async _captureCloudflare(url, viewport) {
    let endpoint = new URL(
      `/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
      'https://api.cloudflare.com',
    );
    endpoint.searchParams.set('cacheTTL', '0');

    let response = await this._fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_BROWSER_RUN_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.toString(),
        viewport,
        gotoOptions: { waitUntil: 'networkidle0' },
        waitForTimeout: 1000,
        screenshotOptions: { type: 'png' },
      }),
    });

    if (!response.ok) {
      let message = await this._cloudflareErrorMessage(response);
      throw new Error(`Cloudflare Browser Run screenshot failed (${response.status}): ${message}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async _cloudflareErrorMessage(response) {
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
    if (this._httpServer) {
      await this._httpServer.close();
    }
    this._httpServer = null;

    if (this._page) {
      await this._page.close();
    }
    this._page = null;

    if (this._browser) {
      await this._browser.close();
    }
    this._browser = null;
    this._provider = null;
  }
}
