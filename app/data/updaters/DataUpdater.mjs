import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import jsonpath from 'jsonpath';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import SplatNet3Client from "../../splatnet/SplatNet3Client.mjs";
import ImageProcessor from '../ImageProcessor.mjs';
import NsoClient from '../../splatnet/NsoClient.mjs';

export default class DataUpdater
{
  name = null;
  filename = null;
  outputDirectory = 'dist/data';

  imagePaths = [];

  constructor(region = null) {
    this.splatnet = new SplatNet3Client(NsoClient.make(region));
    this.imageProcessor = new ImageProcessor;
  }

  get region() {
    return this.splatnet.nsoClient.region;
  }

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name);

    return this._console;
  }

  async update() {
    this.console.info('Updating data...');

    // Retrieve the data
    let data = await this.tryRequest(this.getData());

    // Download any new images
    await this.downloadImages(data);

    // Write the data to disk
    await this.saveData(data);

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

  async saveData(data) {
    let s = await this.formatDataForWrite(data);

    await this.writeFile(this.getPath(this.filename), s);

    // Write a secondary file for backup
    let filename = `${this.filename}.${Date.now()}`;
    await this.writeFile(this.getPath(filename), s);
  }

  getPath(filename) {
    return `${this.outputDirectory}/${filename}.json`;
  }

  async formatDataForWrite(data) {
    // If we're running in debug mode, format the JSON output so it's easier to read
    let debug = !!process.env.DEBUG;
    let space = debug ? 2 : undefined;

    return JSON.stringify(data, undefined, space);
  }

  async writeFile(file, data) {
    await mkdirp(path.dirname(file))
    await fs.writeFile(file, data);
  }
}
