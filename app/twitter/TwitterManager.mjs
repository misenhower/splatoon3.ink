import ScreenshotHelper from "../screenshots/ScreenshotHelper.mjs";
import TweetGenerator from "./generators/TweetGenerator.mjs";
import TwitterClient from "./TwitterClient.mjs";

export default class TwitterManager
{
  /** @type {TweetGenerator[]} */
  generators;

  /** @type {TwitterClient} */
  client;

  /** @type {ScreenshotHelper} */
  screenshotHelper;

  constructor(generators = []) {
    this.generators = generators;
    this.client = new TwitterClient;
    this.screenshotHelper = new ScreenshotHelper;
  }

  async sendTweets() {
    for (let generator of this.generators) {
      if (!(await generator.shouldTweet())) {
        continue;
      }

      await generator.sendTweet(this.screenshotHelper, this.client);
    }

    await this.screenshotHelper.close();
  }
}
