import atprotoApi from '@atproto/api';
import sharp from 'sharp';
import Client from './Client.mjs';

const { BskyAgent, RichText } = atprotoApi;

export default class BlueskyClient extends Client
{
  key = 'bluesky';
  name = 'Bluesky';

  #agent;

  async canSend() {
    return process.env.BLUESKY_SERVICE
      && process.env.BLUESKY_IDENTIFIER
      && process.env.BLUESKY_PASSWORD;
  }

  async login() {
    if (!this.#agent) {
      this.#agent = new BskyAgent({
        service: process.env.BLUESKY_SERVICE,
      });

      await this.#agent.login({
        identifier: process.env.BLUESKY_IDENTIFIER,
        password: process.env.BLUESKY_PASSWORD,
      });
    }
  }

  async updateProfile(avatarBuffer, displayName) {
    await this.login();

    let jpeg = await sharp(avatarBuffer).jpeg().toBuffer();
    let uploadResponse = await this.#agent.uploadBlob(jpeg, { encoding: 'image/jpeg' });

    await this.#agent.upsertProfile((existing) => {
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
          let jpeg = sharp(m.file).jpeg();
          let metadata = await jpeg.metadata();
          let buffer = await jpeg.toBuffer();

          let response = await this.#agent.uploadBlob(buffer, { encoding: 'image/jpeg' });

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

      await rt.detectFacets(this.#agent);

      await this.#agent.post({
        text: rt.text,
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
