import fs from 'fs/promises';
import { createPinia, setActivePinia } from 'pinia';
import { useGearDataStore, useSchedulesDataStore } from '../../../src/stores/data.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import Tweet from '../Tweet.mjs';
import TwitterClient from '../TwitterClient.mjs';
import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';

export default class TweetGenerator
{
  name = null;

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Twitter', this.name);

    return this._console;
  }

  async preparePinia() {
    if (this._piniaInitialized) {
      return;
    }

    setActivePinia(createPinia());

    useSchedulesDataStore().setData(JSON.parse(await fs.readFile('dist/data/schedules.json')));
    useGearDataStore().setData(JSON.parse(await fs.readFile('dist/data/gear.json')));

    this._piniaInitialized = true;
  }

  async shouldTweet() {
    return true;
  }

  /**
   * @param {ScreenshotHelper} screenshotHelper
   * @param {TwitterClient} twitterClient
   */
  async sendTweet(screenshotHelper, twitterClient) {
    let tweet = await this.getTweet(screenshotHelper);

    await twitterClient.send(tweet);
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
