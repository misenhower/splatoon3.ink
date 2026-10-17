import { BskyAgent, RichText } from '@atproto/api';
import sharp from 'sharp';
import Client from './Client.mjs';
import { validateSocialPost } from '../validateSocialPost.mjs';

export default class BlueskyClient extends Client
{
  key = 'bluesky';
  name = 'Bluesky';

  _agent;

  constructor({ locale = 'en-US', service, identifier, password } = {}) {
    super();
    this.locale = locale;
    this.key = locale === 'ja-JP' ? 'bluesky.jp' : 'bluesky';
    this.name = locale === 'ja-JP' ? 'Bluesky (JP)' : 'Bluesky';
    const prefix = locale === 'ja-JP' ? 'BLUESKY_JP' : 'BLUESKY';
    this.service = service ?? process.env[`${prefix}_SERVICE`];
    this.identifier = identifier ?? process.env[`${prefix}_IDENTIFIER`];
    this.password = password ?? process.env[`${prefix}_PASSWORD`];
  }

  async canSend() {
    return this.service && this.identifier && this.password;
  }

  async login() {
    if (!this._agent) {
      const agent = new BskyAgent({ service: this.service });

      await agent.login({
        identifier: this.identifier,
        password: this.password,
      });

      this._agent = agent;
    }
  }

  async updateProfile(avatarBuffer, displayName) {
    await this.login();

    let jpeg = await sharp(avatarBuffer).jpeg().toBuffer();
    let uploadResponse = await this._agent.uploadBlob(jpeg, { encoding: 'image/jpeg' });

    await this._agent.upsertProfile((existing) => {
      return {
        ...existing,
        avatar: uploadResponse.data.blob,
        displayName,
      };
    });
  }

  async send(status, generator) {
    validateSocialPost(status, this.locale);

    if (!status.media?.length) {
      console.error(`[${this.name}] No media provided for ${generator.key}`);
      return;
    }

    try {
      await this.login();

      // Upload images
      let images = await Promise.all(
        status.media.map(async m => {
          // We have to convert the PNG to a JPG for Bluesky because of size limits
          let jpeg = sharp(m.file).jpeg();
          let metadata = await jpeg.metadata();
          let buffer = await jpeg.toBuffer();

          let response = await this._agent.uploadBlob(buffer, { encoding: 'image/jpeg' });

          return {
            image: response.data.blob,
            alt: m.altText || '',
            aspectRatio: { width: metadata.width, height: metadata.height },
          };
        }),
      );

      // Send status
      const rt = new RichText({
        text: status.status,
      });

      await rt.detectFacets(this._agent);

      await this._agent.post({
        text: rt.text,
        langs: [this.locale === 'ja-JP' ? 'ja' : 'en'],
        facets: rt.facets,
        embed: {
          images,
          $type: 'app.bsky.embed.images',
        },
      });
    } catch (error) {
      console.error(`[${this.name}] Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }
}
