import { TwitterApi } from "twitter-api-v2";
import Status from "./Status.mjs";

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
   * @param {Status} status
   */
  async send(status) {
    // Upload images
    let mediaIds = await Promise.all(
      status.media.map(async m => {
        let id = await this.#api.v1.uploadMedia(m.file, { mimeType: m.type });

        if (m.altText) {
          await this.#api.v1.createMediaMetadata(id, { alt_text: { text: m.altText } });
        }

        return id;
      }),
    );

    // Send status
    await this.#api.v1.tweet(status.status, { media_ids: mediaIds });
  }
}
