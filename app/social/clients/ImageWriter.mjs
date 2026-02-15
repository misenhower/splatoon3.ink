import fs from 'fs/promises';
import Client from './Client.mjs';

export default class ImageWriter extends Client {
  key = 'image';
  name = 'ImageWriter';

  dir = 'dist/status-screenshots'; // `/screenshots` points to the page used by puppeteer

  async send(status, generator) {
    if (!status.media?.length) {
      return;
    }

    await fs.mkdir(this.dir, { recursive: true });

    let imgFilename = `${this.dir}/${generator.key}.png`;
    await fs.writeFile(imgFilename, status.media[0].file);
  }
}
