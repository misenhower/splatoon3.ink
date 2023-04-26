import blue from "@atproto/api";
import Client from "./Client.mjs";
import sharp from "sharp";

const BskyAgent = blue.BskyAgent;

export default class BlueskyClient extends Client
{
  key = 'bluesky';
  name = 'Bluesky';

  #agent;
  #loggedIn = false;

  constructor() {
    super();

    this.#agent = new BskyAgent({
      service: process.env.BLUESKY_SERVICE,
    });
  }

  async login() {
    if (!this.#loggedIn) {
      await this.#agent.login({
        identifier: process.env.BLUESKY_IDENTIFIER,
        password: process.env.BLUESKY_PASSWORD,
      });

      this.#loggedIn = true;
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
    await this.#agent.post({
      text: status.status,
      embed: {
        images,
        $type: 'app.bsky.embed.images',
      },
    });
  }
}
