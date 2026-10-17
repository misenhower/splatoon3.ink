import { TwitterApi } from 'twitter-api-v2';
import Client from './Client.mjs';

export default class TwitterClient extends Client
{
  key = 'twitter';
  name = 'Twitter';

  /** @member {TwitterApi} */
  _api;

  async canSend() {
    return ['CONSUMER_KEY', 'CONSUMER_SECRET', 'ACCESS_TOKEN_KEY', 'ACCESS_TOKEN_SECRET']
      .every(key => !!process.env[`TWITTER_${key}`]);
  }

  api() {
    if (!this._api) {
      this._api = new TwitterApi({
        appKey: process.env.TWITTER_CONSUMER_KEY,
        appSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });
    }

    return this._api;
  }

  async updateProfile(avatarBuffer, displayName) {
    await this.api().v1.updateAccountProfileImage(avatarBuffer);
    await this.api().v1.updateAccountProfile({ name: displayName });
  }

  async send(status, generator) {
    if (!status.media?.length) {
      console.error(`[${this.name}] No media provided for ${generator.key}`);
      return;
    }

    try {
      // Upload images
      let mediaIds = await Promise.all(
        status.media.map(async m => {
          let id = await this.api().v1.uploadMedia(Buffer.from(m.file), { mimeType: m.type });

          if (m.altText) {
            await this.api().v1.createMediaMetadata(id, { alt_text: { text: m.altText } });
          }

          return id;
        }),
      );

      // Send status
      await this.api().v2.tweet(status.status, { media: { media_ids: mediaIds } });
    } catch (error) {
      console.error(`[${this.name}] Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }
}
