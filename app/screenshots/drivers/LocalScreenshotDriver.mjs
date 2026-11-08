import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import HttpServer from '../HttpServer.mjs';
import { screenshotReadyTimeout } from '../../../src/common/screenshot.mjs';

/**
 * Captures the built frontend (dist/) with a locally installed Chrome, served on loopback.
 * It deliberately ignores SITE_URL, which normally points at the public site.
 */
export default class LocalScreenshotDriver {
  constructor({
    env = process.env,
    root = './dist',
    puppeteerClient = puppeteer,
    httpServerFactory = () => new HttpServer({ root, host: '127.0.0.1' }),
  } = {}) {
    this.env = env;
    this.puppeteer = puppeteerClient;
    this.httpServerFactory = httpServerFactory;
  }

  async open() {
    const executablePath = this.env.CHROME_PATH || [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
    ].find(path => existsSync(path));

    if (!executablePath) throw new Error('Set CHROME_PATH to a local Chrome or Chromium executable');

    try {
      this.server = this.httpServerFactory();
      await this.server.open();
      this.browser = await this.puppeteer.launch({ executablePath, headless: true });
      this.page = await this.browser.newPage();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async capture(route, viewport) {
    const url = new URL(`http://127.0.0.1:${this.server.port}/screenshots/`);
    url.hash = route;

    await this.page.setViewport(viewport);

    // Start fresh so a hash-only route change cannot reuse the previous page's ready marker.
    await this.page.goto('about:blank');

    const response = await this.page.goto(url.href, { waitUntil: 'load' });

    if (!response?.ok()) {
      throw new Error(`Screenshot page failed (${response?.status() ?? 'no response'}): ${url}`);
    }

    await this.page.waitForFunction(() => {
      const { screenshotReady, screenshotError } = document.documentElement.dataset;
      return screenshotReady === 'true' || !!screenshotError;
    }, { timeout: screenshotReadyTimeout });

    const error = await this.page.evaluate(() => document.documentElement.dataset.screenshotError);
    if (error) throw new Error(error);

    return this.page.screenshot();
  }

  async close() {
    try {
      // Closing the browser also closes any pages, including partially opened ones.
      await this.browser?.close();
    } finally {
      const server = this.server;
      this.browser = null;
      this.page = null;
      this.server = null;

      await server?.close();
    }
  }
}
