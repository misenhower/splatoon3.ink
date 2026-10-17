import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import HttpServer from '../HttpServer.mjs';
import { screenshotReadyTimeout } from '../../../src/common/screenshot.mjs';

export default class LocalScreenshotDriver {
  constructor({ env = process.env, root = './dist', puppeteerClient = puppeteer } = {}) {
    this.env = env;
    this.root = root;
    this.puppeteer = puppeteerClient;
  }

  async open() {
    const executablePath = this.env.CHROME_PATH || [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
    ].find(path => existsSync(path));

    if (!executablePath) throw new Error('Set CHROME_PATH to a local Chrome or Chromium executable');

    try {
      this.server = new HttpServer({ root: this.root, host: '127.0.0.1' });
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
    await this.page.goto(url.href, { waitUntil: 'load' });
    await this.page.waitForFunction(() => {
      const { screenshotReady, screenshotError } = document.documentElement.dataset;
      return screenshotReady === 'true' || !!screenshotError;
    }, { timeout: screenshotReadyTimeout });

    const error = await this.page.evaluate(() => document.documentElement.dataset.screenshotError);
    if (error) throw new Error(error);

    return this.page.screenshot();
  }

  async close() {
    await this.browser?.close();
    await this.server?.close();
    this.browser = null;
    this.server = null;
  }
}
