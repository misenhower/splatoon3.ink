import fs from 'fs/promises';
import { createPinia, setActivePinia } from 'pinia';
import { useCoopDataStore, useFestivalsDataStore, useGearDataStore, useSchedulesDataStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Status from '../Status.mjs';
import TwitterClient from '../TwitterClient.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import { getTopOfCurrentHour } from '../../common/util.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ValueCache from '../../common/ValueCache.mjs';

export default class StatusGenerator
{
  key = null;
  name = null;

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Twitter', this.name);

    return this._console;
  }

  get lastPostCache() {
    this._lastPostCache ??= new ValueCache(`twitter.${this.key}`);

    return this._lastPostCache;
  }

  async preparePinia() {
    if (this._piniaInitialized) {
      return;
    }

    setActivePinia(createPinia());

    useTimeStore().setNow(getTopOfCurrentHour());

    useSchedulesDataStore().setData(JSON.parse(await fs.readFile('dist/data/schedules.json')));
    useGearDataStore().setData(JSON.parse(await fs.readFile('dist/data/gear.json')));
    useCoopDataStore().setData(JSON.parse(await fs.readFile('dist/data/coop.json')));
    useFestivalsDataStore().setData(JSON.parse(await fs.readFile('dist/data/festivals.json')));

    this._piniaInitialized = true;
  }

  async getDataTime() {
    await this.preparePinia();

    return useTimeStore().now;
  }

  async shouldPost() {
    let currentTime = await this.getDataTime();
    let cachedTime = await this.lastPostCache.getData();

    return currentTime && (!cachedTime || (currentTime > cachedTime));
  }

  async updatelastPostCache() {
    let currentTime = await this.getDataTime();

    await this.lastPostCache.setData(currentTime);
  }

  /**
   * @param {ScreenshotHelper} screenshotHelper
   * @param {TwitterClient} twitterClient
   */
  async sendStatus(screenshotHelper, twitterClient) {
    let status = await this.getStatus(screenshotHelper);

    await twitterClient.send(status);

    await this.updatelastPostCache();
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getStatus(screenshotHelper) {
    const status = new Status;
    status.status = await this._getStatus();

    let media = await this.getMedia(screenshotHelper);
    if (media && !Array.isArray(media)) {
      media = [media];
    }
    status.media = media;

    return status;
  }

  async _prepareScreenshotHelper(screenshotHelper) {
    await this.preparePinia();
    let time = useTimeStore().now;
    screenshotHelper.defaultParams = { time };
  }

  async _getStatus () {
    //
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getMedia(screenshotHelper) {
    await this._prepareScreenshotHelper(screenshotHelper);

    return await this._getMedia(screenshotHelper);
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    //
  }
}
