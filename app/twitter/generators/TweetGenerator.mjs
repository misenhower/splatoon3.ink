import fs from 'fs/promises';
import { createPinia, setActivePinia } from 'pinia';
import { useGearStore, useSchedulesStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Tweet from '../Tweet.mjs';

export default class TweetGenerator
{
  name = null;

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Twitter', this.name);

    return this._console;
  }

  async preparePinia() {
    setActivePinia(createPinia());

    useSchedulesStore().setData(JSON.parse(await fs.readFile('dist/data/schedules.json')));
    useGearStore().setData(JSON.parse(await fs.readFile('dist/data/gear.json')));
  }

  async shouldTweet() {
    return true;
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async getTweet(screenshotHelper) {
    const tweet = new Tweet;
    tweet.status = await this._getStatus();

    let media = await this._getMedia(screenshotHelper);
    if (media && !Array.isArray(media)) {
      media = [media];
    }
    tweet.media = media;

    return tweet;
  }

  async _getStatus () {
    //
  }

  /** @param {ScreenshotHelper} screenshotHelper */
  async _getMedia(screenshotHelper) {
    //
  }
}
