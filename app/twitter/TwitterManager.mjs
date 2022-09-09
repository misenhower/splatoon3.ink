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

      let tweet = await generator.getTweet(this.screenshotHelper);

      await this.client.send(tweet);
    }

    await this.screenshotHelper.close();
  }
}
