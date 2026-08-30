import { URL } from 'url';
import puppeteer from 'puppeteer-core';
import HttpServer from '../HttpServer.mjs';

export default class BrowserlessScreenshotDriver
{
  _browser = null;
  _env;
  _httpServer = null;
  _httpServerFactory;
  _page = null;
  _puppeteer;

  constructor({
    env = process.env,
    httpServerFactory = () => new HttpServer,
    puppeteerClient = puppeteer,
  } = {}) {
    this._env = env;
    this._httpServerFactory = httpServerFactory;
    this._puppeteer = puppeteerClient;
  }

  async open() {
    if (!this._env.BROWSERLESS_ENDPOINT) {
      throw new Error('Missing Browserless screenshot configuration: BROWSERLESS_ENDPOINT');
    }

    this._httpServer = this._httpServerFactory();
    await this._httpServer.open();

    this._browser = await this._puppeteer.connect({
      browserWSEndpoint: this._env.BROWSERLESS_ENDPOINT,
    });
    this._page = await this._browser.newPage();
  }

  async capture(route, viewport) {
    let host = this._env.SCREENSHOT_HOST || 'localhost';
    let url = new URL(`http://${host}:${this._httpServer.port}/screenshots/`);
    url.hash = route;

    await this._page.setViewport(viewport);
    await this._page.goto(url, {
      waitUntil: 'networkidle0',
    });
    await this._page.waitForNetworkIdle({ idleTime: 1000 });

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
