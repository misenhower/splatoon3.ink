import PQueue from 'p-queue';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { normalizeSplatnetResourcePath } from '../common/util.mjs';
import { storage } from '../common/storage/index.mjs';

const queue = new PQueue({ concurrency: 4 });

// Downloads in progress, by destination. Updaters run concurrently and often reference the
// same images; without this, each would see the file as missing and download it again.
const inFlight = new Map();

export default class ImageProcessor
{
  // Public storage key prefix (served at ASSET_URL/splatnet/)
  storagePrefix = 'splatnet';
  // Path on the site for local runs without ASSET_URL
  outputDirectory = 'assets/splatnet';

  constructor() {
    this.console = prefixedConsole('Images');
    this.siteUrl = process.env.SITE_URL;
    this.assetUrl = process.env.ASSET_URL?.replace(/\/+$/, '');
  }

  async process(url, defer = true) {
    // Normalize the path
    let destination = this.normalize(url);

    // Download the image if necessary
    let job = () => this.maybeDownload(url, destination);
    // defer ? queue.add(job) : await job();
    if (defer) {
      queue.add(job);
    } else {
      await job();
    }

    // Return the new public URL
    return [destination, this.publicUrl(destination)];
  }

  static onIdle() {
    return queue.onIdle();
  }

  normalize(url) {
    return normalizeSplatnetResourcePath(url);
  }

  storageKey(file) {
    return `${this.storagePrefix}/${file}`;
  }

  publicUrl(file) {
    if (this.assetUrl) {
      return `${this.assetUrl}/splatnet/${file}`;
    }

    return `${this.siteUrl ?? ''}/${this.outputDirectory}/${file}`;
  }

  maybeDownload(url, destination) {
    let pending = inFlight.get(destination);

    if (!pending) {
      pending = this._maybeDownload(url, destination)
        .finally(() => inFlight.delete(destination));
      inFlight.set(destination, pending);
    }

    return pending;
  }

  async _maybeDownload(url, destination) {
    // If the file already exists, we don't need to download it again
    if (await storage().public.exists(this.storageKey(destination))) {
      return;
    }

    return await this.download(url, destination);
  }

  async download(url, destination) {
    this.console.info(`Downloading image: ${destination}`);

    try {
      let result = await fetch(url);

      if (!result.ok) {
        throw new Error(`Invalid image response code: ${result.status}`);
      }

      await storage().public.writeBytes(this.storageKey(destination), new Uint8Array(await result.arrayBuffer()));
    } catch (e) {
      this.console.error(`Image download failed for ${destination}`, e);
    }
  }
}
