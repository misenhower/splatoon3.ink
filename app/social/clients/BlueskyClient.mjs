import atprotoApi from "@atproto/api";
import sharp from "sharp";
import Client from "./Client.mjs";

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

  async send(status, generator) {
    await this.login();

    // Upload images
    let images = await Promise.all(
      status.media.map(async m => {
        // We have to convert the PNG to a JPG for Bluesky because of size limits
        let jpeg = await sharp(m.file).jpeg().toBuffer();

        let response = await this.#agent.uploadBlob(jpeg, { encoding: 'image/jpeg' })

        return {
          image: response.data.blob,
          alt: m.altText || '',
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
  }
}
