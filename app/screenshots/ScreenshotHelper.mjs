import createScreenshotDriver from './drivers/createScreenshotDriver.mjs';

const defaultViewport = {
  // Using a 16:9 ratio here by default to match Twitter's image card dimensions
  width: 1200,
  height: 675,
  deviceScaleFactor: 2,
};

export default class ScreenshotHelper
{
  _driver = null;
  _driverDependencies;
  _isOpen = false;

  defaultParams = null;

  constructor(driverDependencies = {}) {
    this._driverDependencies = driverDependencies;
  }

  get isOpen() {
    return this._isOpen;
  }

  async open() {
    await this.close();

    this._driver = createScreenshotDriver(
      process.env.SCREENSHOT_PROVIDER,
      this._driverDependencies,
    );
    await this._driver.open();
    this._isOpen = true;
  }

  async capture(path, options = {}) {
    if (!this.isOpen) {
      await this.open();
    }

    let params = {
      ...this.defaultParams,
      ...options.params,
    };
    let route = path;

    if (Object.keys(params).length) {
      route += '?';
      route += Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
    }

    let viewport = {
      ...defaultViewport,
      ...options.viewport,
    };

    return await this._driver.capture(route, viewport);
  }

  async close() {
    if (this._driver) {
      await this._driver.close();
    }
    this._driver = null;
    this._isOpen = false;
  }
}
