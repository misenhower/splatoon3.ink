import fs from 'fs/promises';
import { Console } from 'node:console';
import { createPinia, setActivePinia } from 'pinia';
import { useCoopDataStore, useFestivalsDataStore, useGearDataStore, useSchedulesDataStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Status from '../Status.mjs';
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
    this._console ??= prefixedConsole('Social', this.name);

    return this._console;
  }

  lastPostCache(client) {
    return new ValueCache(`social.${client.key}.${this.key}`);
  }

  async preparePinia() {
    if (this._piniaInitialized) {
      return;
    }

    setActivePinia(createPinia());

    useTimeStore().setNow(getTopOfCurrentHour().getTime());

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

  async shouldPost(client) {
    let currentTime = await this.getDataTime();
    let cachedTime = await this.lastPostCache(client).getData();

    return currentTime && (!cachedTime || (currentTime > cachedTime));
  }

  async updatelastPostCache(client) {
    let currentTime = await this.getDataTime();

    await this.lastPostCache(client).setData(currentTime);
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getStatus(screenshotHelper) {
    this.console.log('Generating status...');

    const status = new Status;
    status.status = await this._getStatus();
    status.contentWrapper = await this._getContentWrapper();

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

  async _getContentWrapper() {
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
