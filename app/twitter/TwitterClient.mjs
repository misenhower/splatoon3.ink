import { TwitterApi } from "twitter-api-v2";
import Tweet from "./Tweet.mjs";

export default class TwitterClient
{
  /** @var {TwitterApi} */
  #api;

  constructor() {
    this.#api = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  /**
   * @param {Tweet} tweet
   */
  async send(tweet) {
    // Upload images
    let mediaIds = await Promise.all(
      tweet.media.map(m => this.#api.v1.uploadMedia(m.file, { mimeType: m.type}))
    );

    // Send tweet
    await this.#api.v1.tweet(tweet.status, { media_ids: mediaIds });
  }
}
