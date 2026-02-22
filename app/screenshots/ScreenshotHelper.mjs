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
  /** @type {HttpServer} */
  _httpServer = null;
  /** @type {puppeteer.Browser} */
  _browser = null;
  /** @type {puppeteer.Page} */
  _page = null;

  defaultParams = null;

  get isOpen() {
    return !!this._browser;
  }

  /** @type {puppeteer.Page} */
  get page() {
    return this._page;
  }

  async open() {
    await this.close();

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

    await this.applyViewport(options.viewport);

    // Navigate to the URL
    let host = process.env.SCREENSHOT_HOST || 'localhost';
    let url = new URL(`http://${host}:${this._httpServer.port}/screenshots/`);
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

    await this._page.goto(url, {
      waitUntil: 'networkidle0', // Wait until the network is idle
    });

    // Wait an additional 1000ms
    await this._page.waitForNetworkIdle({ idleTime: 1000 });

    // Take the screenshot
    return await this._page.screenshot();
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
  }
}
