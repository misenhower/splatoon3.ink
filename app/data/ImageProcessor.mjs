import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import prefixedConsole from "../common/prefixedConsole.mjs";

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
    return this.publicUrl(destination);
  }

  normalize(url) {
    // Parse the URL
    let u = new URL(url);

    // Get just the pathname (without the host, query string, etc.)
    let result = u.pathname;

    // Remove "/resources/prod" from the beginning if it exists
    result = result.replace(/^\/resources\/prod/, '');

    // Remove the leading slash
    result = result.replace(/^\//, '');

    return result;
  }

  localPath(file) {
    return `${this.destinationDirectory}/${this.outputDirectory}/${file}`;
  }

  publicUrl(file) {
    return `${this.siteUrl}/${this.outputDirectory}/${file}`;
  }

  async exists(file) {
    try {
      await fs.access(this.localPath(file));

      return true;
    } catch (e) {
      //
    }

    return false;
  }

  async maybeDownload(url, destination) {
    // If the file already exists, we don't need to download it again
    if (await this.exists(destination)) {
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
