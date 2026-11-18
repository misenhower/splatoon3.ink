import { createPinia } from 'pinia';
import { useCoopDataStore, useFestivalsDataStore, useGearDataStore, useSchedulesDataStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Status from '../Status.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import { getTopOfCurrentHour } from '../../common/util.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ValueCache from '../../common/ValueCache.mjs';
import { storage } from '../../common/storage/index.mjs';
import SocialMessages from '../i18n/SocialMessages.mjs';
import ImageDescriptions from '../ImageDescriptions.mjs';

const SAVE_ATTEMPTS = 4;

export default class StatusGenerator
{
  key = null;
  name = null;

  constructor({ locale = 'en-US', translations = null, now = null } = {}) {
    this.messages = new SocialMessages(locale, translations);
    this.images = new ImageDescriptions(this.messages);
    this.now = now;
  }

  get locale() {
    return this.messages.locale;
  }

  t(key, params) {
    return this.messages.text(key, params);
  }

  game(category, node, field) {
    return this.messages.game(category, node, field);
  }

  /** @type {ReturnType<typeof prefixedConsole>} */
  get console() {
    this._console ??= prefixedConsole('Social', this.name);

    return this._console;
  }

  lastPostCache(client) {
    return new ValueCache(`social.${client.key}.${this.key}`);
  }

  async preparePinia() {
    this._piniaPromise ??= this._loadData();

    await this._piniaPromise;
  }

  async _loadData() {
    this.pinia = createPinia();
    useTimeStore(this.pinia).setNow(this.now ?? getTopOfCurrentHour().getTime());

    const files = [
      ['schedules', useSchedulesDataStore],
      ['gear', useGearDataStore],
      ['coop', useCoopDataStore],
      ['festivals', useFestivalsDataStore],
    ];

    await Promise.all(files.map(async ([name, store]) => {
      let data = await storage().public.readJson(`data/${name}.json`);

      if (!data) {
        throw new Error(`Missing published data: data/${name}.json`);
      }

      store(this.pinia).setData(data);
    }));
  }

  async getDataTime() {
    await this.preparePinia();

    return useTimeStore(this.pinia).now;
  }

  async shouldPost(client) {
    let currentTime = await this.getDataTime();
    // A last post time that cannot be read is an error, not "never posted": answering null
    // here once posted everything again while R2 was failing reads.
    let cachedTime = await this.lastPostCache(client).getData({ strict: true });

    return currentTime && (!cachedTime || (currentTime > cachedTime));
  }

  // Wait before trying again to save a post's time; later attempts wait longer.
  saveRetryDelayMs = 1000;

  async updatelastPostCache(client) {
    let currentTime = await this.getDataTime();
    let cache = this.lastPostCache(client);

    // The post has already gone out, and a time that is not saved means posting it again on the
    // next run, so a failed write is tried a few more times.
    for (let attempt = 1; ; attempt++) {
      try {
        return await cache.setData(currentTime);
      } catch (e) {
        if (attempt >= SAVE_ATTEMPTS) {
          throw e;
        }

        await new Promise(resolve => setTimeout(resolve, this.saveRetryDelayMs * 2 ** (attempt - 1)));
      }
    }
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getStatus(screenshotHelper) {
    this.console.log('Generating status...');
    await this.messages.load();

    const status = new Status;
    status.locale = this.locale;
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
    let time = useTimeStore(this.pinia).now;
    screenshotHelper.defaultParams = { time, locale: this.locale };
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
