import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import prefixedConsole from "../common/prefixedConsole.mjs";
import { normalizeSplatnetResourcePath } from '../common/util.mjs';
import { exists } from '../common/fs.mjs';

export default class ImageProcessor
{
  destinationDirectory = 'dist';
  outputDirectory = 'assets/splatnet';

  constructor() {
    this.console = prefixedConsole('Images');
    this.siteUrl = process.env.SITE_URL;
  }

  async process(url) {
    // Normalize the path
    let destination = this.normalize(url);

    // Download the image if necessary
    await this.maybeDownload(url, destination);

    // Return the new public URL
    return [destination, this.publicUrl(destination)];
  }

  normalize(url) {
    return normalizeSplatnetResourcePath(url);
  }

  localPath(file) {
    return `${this.destinationDirectory}/${this.outputDirectory}/${file}`;
  }

  publicUrl(file) {
    return `${this.siteUrl ?? ''}/${this.outputDirectory}/${file}`;
  }

  async maybeDownload(url, destination) {
    // If the file already exists, we don't need to download it again
    if (await exists(this.localPath(destination))) {
      return
    }

    return await this.download(url, destination);
  }

  async download(url, destination) {
    this.console.info(`Downloading image: ${destination}`);

    try {
      let result = await fetch(url);

      await mkdirp(path.dirname(this.localPath(destination)));
      await fs.writeFile(this.localPath(destination), result.body);
    } catch (e) {
      this.console.error(`Image download failed for ${destination}`, e);
    }
  }
}
