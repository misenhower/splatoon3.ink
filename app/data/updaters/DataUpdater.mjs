import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import jsonpath from 'jsonpath';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import SplatNet3Client from "../../splatnet/SplatNet3Client.mjs";
import ImageProcessor from '../ImageProcessor.mjs';

export default class DataUpdater
{
  name = null;
  filename = null;
  outputDirectory = 'dist/data';

  imagePaths = [];

  constructor() {
    this.splatnet = new SplatNet3Client;
    this.imageProcessor = new ImageProcessor;
  }

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Updater', this.name);

    return this._console;
  }

  get path() {
    return `${this.outputDirectory}/${this.filename}`;
  }

  async update() {
    this.console.info('Updating data...');

    // Retrieve the data
    let data = await this.tryRequest(this.getData());

    // Download any new images
    await this.downloadImages(data);

    // Write the data to disk
    await this.writeData(this.path, data);

    this.console.info('Done');
  }

  // Requests

  getData() {
    //
  }

  async tryRequest(promise) {
    try {
      return await promise;
    } catch (e) {
      this.console.error('Error handling request:', e);

      throw e;
    }
  }

  // Processing

  async downloadImages(data) {
    for (let expression of this.imagePaths) {
      // This JSONPath library is completely synchronous, so we have to
      // build a mapping here after transforming all URLs.
      let mapping = {};
      for (let url of jsonpath.query(data, expression)) {
        let publicUrl = await this.imageProcessor.process(url);
        mapping[url] = publicUrl;
      }

      // Now apply the URL transformations
      jsonpath.apply(data, expression, url => mapping[url]);
    }
  }

  // File handling

  formatDataForWrite(data) {
    // If we're running in debug mode, format the JSON output so it's easier to read
    let debug = !!process.env.DEBUG;
    let space = debug ? 2 : undefined;

    return JSON.stringify(data, undefined, space);
  }

  async writeData(file, data) {
    let s = this.formatDataForWrite(data);
    await this.writeFile(file, s);
  }

  async writeFile(file, data) {
    await mkdirp(path.dirname(file))
    await fs.writeFile(file, data);
  }
}
