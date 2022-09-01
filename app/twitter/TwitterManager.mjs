import TweetGenerator from "./generators/TweetGenerator.mjs";
import TwitterClient from "./TwitterClient.mjs";

export default class TwitterManager
{
  /** @var {TweetGenerator[]} */
  generators;

  /** @var {TwitterClient} */
  client;

  constructor(generators = []) {
    this.generators = generators;
    this.client = new TwitterClient;
  }

  async sendTweets() {
    for (let generator of this.generators) {
      if (!(await generator.shouldTweet())) {
        continue;
      }

      let tweet = await generator.getTweet();

      await this.client.send(tweet);
    }
  }
}
