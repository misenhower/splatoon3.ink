import fs from 'fs/promises';
import mkdirp from 'mkdirp';
import Client from "./Client.mjs";

export default class ImageWriter extends Client {
  key = 'image';
  name = 'ImageWriter';

  dir = 'dist/status-screenshots'; // `/screenshots` points to the page used by puppeteer

  async send(status, generator) {
    await mkdirp(this.dir);

    let imgFilename = `${this.dir}/${generator.key}.png`;
    await fs.writeFile(imgFilename, status.media[0].file);
  }
}
