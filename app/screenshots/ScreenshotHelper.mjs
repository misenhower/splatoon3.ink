import { URL } from 'url';
import puppeteer from 'puppeteer';
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
  #httpServer = null;
  /** @type {puppeteer.Browser} */
  #browser = null;
  /** @type {puppeteer.Page} */
  #page = null;

  defaultParams = null;

  get isOpen() {
    return !!this.#browser;
  }

  /** @type {puppeteer.Page} */
  get page() {
    return this.#page;
  }

  async open() {
    await this.close();

    // Start the HTTP server
    this.#httpServer = new HttpServer;
    await this.#httpServer.open();

    // Launch a new Chrome instance
    this.#browser = await puppeteer.launch({
      args: [
        '--no-sandbox', // Allow running as root inside the Docker container
      ],
      // headless: false, // For testing
    });

    // Create a new page and set the viewport
    this.#page = await this.#browser.newPage();
    await this.applyViewport();
  }

  async applyViewport(viewport = {}) {
    if (this.#page) {
      await this.#page.setViewport({
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
    let url = new URL(`http://localhost:${this.#httpServer.port}/screenshots/`);
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

    await this.#page.goto(url, {
      waitUntil: 'networkidle0', // Wait until the network is idle
    });

    // Wait an additional 1000ms
    await this.#page.waitForNetworkIdle({ idleTime: 1000 });

    // Take the screenshot
    return await this.#page.screenshot();
  }

  async close() {
    if (this.#httpServer) {
      await this.#httpServer.close();
    }
    this.#httpServer = null;

    if (this.#page) {
      await this.#page.close();
    }
    this.#page = null;

    if (this.#browser) {
      await this.#browser.close();
    }
    this.#browser = null;
  }
}
