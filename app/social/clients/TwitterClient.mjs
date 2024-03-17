import { TwitterApi } from 'twitter-api-v2';
import Client from './Client.mjs';

export default class TwitterClient extends Client
{
  key = 'twitter';
  name = 'Twitter';

  /** @member {TwitterApi} */
  #api;

  async canSend() {
    return process.env.TWITTER_CONSUMER_KEY
      && process.env.TWITTER_CONSUMER_SECRET
      && process.env.TWITTER_ACCESS_TOKEN_KEY
      && process.env.TWITTER_ACCESS_TOKEN_SECRET;
  }

  api() {
    if (!this.#api) {
      this.#api = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY,
        appSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });
    }

    return this.#api;
  }

  async send(status, generator) {
    // Upload images
    let mediaIds = await Promise.all(
      status.media.map(async m => {
        let id = await this.api().v1.uploadMedia(m.file, { mimeType: m.type });

        if (m.altText) {
          await this.api().v1.createMediaMetadata(id, { alt_text: { text: m.altText } });
        }

        return id;
      }),
    );

    // Send status
    await this.api().v2.tweet(status.status, { media: { media_ids: mediaIds } });
  }
}
