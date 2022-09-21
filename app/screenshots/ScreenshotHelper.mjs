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
  /** @type {puppeteer.Viewport} */
  #viewport = null;

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
    await this.setViewport();
  }

  async setViewport(viewport = {}) {
    this.#viewport = { ...defaultViewport, viewport };

    if (this.#page) {
      await this.#page.setViewport(this.#viewport);
    }
  }

  async capture(path, options = {}) {
    if (!this.isOpen) {
      await this.open();
    }

    await this.setViewport(options.viewport);

    // Navigate to the URL
    let url = new URL(`http://localhost:${this.#httpServer.port}/screenshots/`);
    url.hash = path;

    if (this.defaultParams) {
      // We can't use url.searchParams because they need to come after the hash
      url.hash += '?';
      for (let key in this.defaultParams) {
        url.hash += `${key}=${this.defaultParams[key]}`;
      }
    }

    await this.#page.goto(url, {
        waitUntil: 'networkidle0', // Wait until the network is idle
    });

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
