import { storage } from '../../common/storage/index.mjs';
import Client from './Client.mjs';

/** Publishes each status's first image at status-screenshots/{generator}.png. */
export default class ImageWriter extends Client {
  key = 'image';
  name = 'ImageWriter';

  // Public storage key prefix (`/screenshots` is the page used to render them)
  prefix = 'status-screenshots';

  async send(status, generator) {
    if (!status.media?.length) {
      return;
    }

    await storage().public.writeBytes(`${this.prefix}/${generator.key}.png`, status.media[0].file);
  }
}
