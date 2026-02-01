import sharp from 'sharp';
import threads from 'threads-api';
import Client from './Client.mjs';

export default class ThreadsClient extends Client {
  key = 'threads';
  name = 'Threads';

  #api;

  constructor() {
    super();

    this.#api = new threads.ThreadsAPI({
      username: process.env.THREADS_USERNAME,
      // password: process.env.THREADS_PASSWORD,
      token: process.env.THREADS_TOKEN,
      deviceID: process.env.THREADS_DEVICE_ID,
    });
  }

  async canSend() {
    // return process.env.THREADS_USERNAME
    //   && process.env.THREADS_PASSWORD;

    return process.env.THREADS_USERNAME
      && process.env.THREADS_TOKEN
      && process.env.THREADS_DEVICE_ID;
  }

  async send(status, generator) {
    if (!status.media?.length) {
      console.error(`[${this.name}] No media provided for ${generator.key}`);
      return;
    }

    try {
      let jpeg = await sharp(status.media[0].file).jpeg().toBuffer();

      await this.#api.publish({
        text: status.status,
        image: { type: 'image/jpeg', data: jpeg },
      });
    } catch (error) {
      console.error(`[${this.name}] Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }
}
