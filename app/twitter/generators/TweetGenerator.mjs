import fs from 'fs/promises';
import { createPinia, setActivePinia } from 'pinia';
import { useFestivalsDataStore, useGearDataStore, useSchedulesDataStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Tweet from '../Tweet.mjs';
import TwitterClient from '../TwitterClient.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import { getTopOfCurrentHour } from '../../common/util.mjs';
import { useTimeStore } from '../../../src/stores/time.mjs';
import ValueCache from '../../common/ValueCache.mjs';

export default class TweetGenerator
{
  key = null;
  name = null;

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Twitter', this.name);

    return this._console;
  }

  get lastTweetCache() {
    this._lastTweetCache ??= new ValueCache(`twitter.${this.key}`);

    return this._lastTweetCache;
  }

  async preparePinia() {
    if (this._piniaInitialized) {
      return;
    }

    setActivePinia(createPinia());

    useTimeStore().setNow(getTopOfCurrentHour());

    useSchedulesDataStore().setData(JSON.parse(await fs.readFile('dist/data/schedules.json')));
    useGearDataStore().setData(JSON.parse(await fs.readFile('dist/data/gear.json')));
    useFestivalsDataStore().setData(JSON.parse(await fs.readFile('dist/data/festivals.json')));

    this._piniaInitialized = true;
  }

  async getDataTime() {
    await this.preparePinia();

    return useTimeStore().now;
  }

  async shouldTweet() {
    let currentTime = await this.getDataTime();
    let cachedTime = await this.lastTweetCache.getData();

    return currentTime && (!cachedTime || (currentTime > cachedTime));
  }

  async updateLastTweetCache() {
    let currentTime = await this.getDataTime();

    await this.lastTweetCache.setData(currentTime);
  }

  /**
   * @param {ScreenshotHelper} screenshotHelper
   * @param {TwitterClient} twitterClient
   */
  async sendTweet(screenshotHelper, twitterClient) {
    let tweet = await this.getTweet(screenshotHelper);

    await twitterClient.send(tweet);

    await this.updateLastTweetCache();
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getTweet(screenshotHelper) {
    const tweet = new Tweet;
    tweet.status = await this._getStatus();

    let media = await this.getMedia(screenshotHelper);
    if (media && !Array.isArray(media)) {
      media = [media];
    }
    tweet.media = media;

    return tweet;
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
