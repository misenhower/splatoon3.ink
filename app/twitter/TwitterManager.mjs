import fs from 'fs/promises';
import mkdirp from 'mkdirp';
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

  async testTweets() {
    for (let generator of this.generators) {
      let dir = 'temp';
      await mkdirp(dir);

      let tweet = await generator.getTweet(this.screenshotHelper);

      let imgFilename = `temp/${generator.key}.png`;
      await fs.writeFile(imgFilename, tweet.media[0].file);

      let text = [
        'Status:',
        tweet.status,
        '',
        'Alt text:',
        tweet.media[0].altText,
      ].join('\n');

      let textFilename = `temp/${generator.key}.txt`;
      await fs.writeFile(textFilename, text);
    }

    await this.screenshotHelper.close();
  }
}
