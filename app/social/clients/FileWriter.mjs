import fs from 'fs/promises';
import mkdirp from 'mkdirp';
import Client from './Client.mjs';

export default class FileWriter extends Client {
  key = 'file';
  name = 'FileWriter';

  dir = 'temp';

  async send(status, generator) {
    await mkdirp(this.dir);

    let imgFilename = `${this.dir}/${generator.key}.png`;
    await fs.writeFile(imgFilename, status.media[0].file);

    let text = [
      'Status:',
      status.status,
      '',
      'Alt text:',
      status.media[0].altText,
    ].join('\n');

    let textFilename = `${this.dir}/${generator.key}.txt`;
    await fs.writeFile(textFilename, text);
  }
}
