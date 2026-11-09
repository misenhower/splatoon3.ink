import { BskyAgent, RichText } from '@atproto/api';
import { convertToJpeg } from '#image-converter';
import { pngSize } from '../../common/image/png.mjs';
import Client from './Client.mjs';

export default class BlueskyClient extends Client
{
  _agent;

  constructor({
    key = 'bluesky',
    name = 'Bluesky',
    locale = 'en-US',
    envPrefix = 'BLUESKY',
    service,
    identifier,
    password,
  } = {}) {
    super();
    this.key = key;
    this.name = name;
    this.locale = locale;
    this.service = service ?? process.env[`${envPrefix}_SERVICE`];
    this.identifier = identifier ?? process.env[`${envPrefix}_IDENTIFIER`];
    this.password = password ?? process.env[`${envPrefix}_PASSWORD`];
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

    let jpeg = await convertToJpeg(avatarBuffer);
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
          let size = pngSize(m.file);
          let buffer = await convertToJpeg(m.file);

          let response = await this._agent.uploadBlob(buffer, { encoding: 'image/jpeg' });

          return {
            image: response.data.blob,
            alt: m.altText || '',
            ...(size && { aspectRatio: size }),
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
        langs: [this.locale.split('-')[0]],
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
