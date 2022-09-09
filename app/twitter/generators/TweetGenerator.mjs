import ScreenshotHelper from '../../screenshots/ScreenshotHelper.mjs';
import Tweet from '../Tweet.mjs';

export default class TweetGenerator
{
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
