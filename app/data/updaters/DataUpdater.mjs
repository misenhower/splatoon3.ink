import fs from 'fs/promises';
import path from 'path';
import mkdirp from 'mkdirp';
import jsonpath from 'jsonpath';
import ical from 'ical-generator';
import prefixedConsole from "../../common/prefixedConsole.mjs";
import SplatNet3Client from "../../splatnet/SplatNet3Client.mjs";
import ImageProcessor from '../ImageProcessor.mjs';
import NsoClient from '../../splatnet/NsoClient.mjs';
import { locales, defaultLocale } from '../../../src/common/i18n.mjs';
import { LocalizationProcessor } from '../LocalizationProcessor.mjs';
import { deriveId } from '../../common/util.mjs';

export default class DataUpdater
{
  name = null;
  filename = null;
  calendarName = null;
  calendarFilename = null;
  outputDirectory = 'dist/data';
  archiveOutputDirectory = 'storage/archive';

  imagePaths = [];
  derivedIds = [];
  localizations = [];

  constructor(region = null) {
    this.nsoClient = NsoClient.make(region);
    this.imageProcessor = new ImageProcessor;
  }

  get region() {
    return this.nsoClient.region;
  }

  get locales() {
    return locales;
  }

  get defaultLocale() {
    return defaultLocale;
  }

  /** @type {Console} */
  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name);

    return this._console;
  }

  splatnet(locale = null) {
    locale ??= this.defaultLocale;

    return new SplatNet3Client(this.nsoClient, locale.code);
  }

  async shouldUpdate() {
    return true;
  }

  async updateIfNeeded() {
    if (!(await this.shouldUpdate())) {
      this.console.info('No need to update data');
      return;
    }

    return await this.update();
  }

  async update() {
    this.console.info('Updating data...');

    // Retrieve the data
    let data = await this.tryRequest(this.getData(this.defaultLocale));

    // Derive node IDs where needed
    this.deriveIds(data);

    // Update localizations
    await this.updateLocalizations(this.defaultLocale, data);

    // Download any new images
    const images = await this.downloadImages(data);

    // Write the data to disk
    await this.saveData(data);

    // Update iCal data
    await this.updateCalendarEvents(data, images);

    this.console.info('Done');
  }

  // Requests

  getData(locale) {
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

  deriveIds(data) {
    for (let expression of this.derivedIds) {
      jsonpath.apply(data, expression, deriveId);
    }
  }

  async updateLocalizations(initialLocale, data) {
    // Save localizations for the initial locale
    let processor = new LocalizationProcessor(initialLocale, this.localizations);
    await processor.updateLocalizations(data);

    // Retrieve data for missing languages
    for (let locale of this.locales.filter(l => l !== initialLocale)) {
      processor = new LocalizationProcessor(locale, this.localizations);

      if (await processor.hasMissingLocalizations(data)) {
        this.console.info(`Retrieving localized data for ${locale.code}`);

        let regionalData = await this.getData(locale);
        this.deriveIds(regionalData);
        await processor.updateLocalizations(regionalData);
      }
    }
  }

  async downloadImages(data) {
    // Return a map of image URLs to their local path
    const images = {};

    for (let expression of this.imagePaths) {
      // This JSONPath library is completely synchronous, so we have to
      // build a mapping here after transforming all URLs.
      let mapping = {};
      for (let url of jsonpath.query(data, expression)) {
        let [path, publicUrl] = await this.imageProcessor.process(url);
        mapping[url] = publicUrl;
        images[publicUrl] = path;
      }

      // Now apply the URL transformations
      jsonpath.apply(data, expression, url => mapping[url]);
    }

    return images;
  }

  // File handling

  async saveData(data) {
    let s = await this.formatDataForWrite(data);

    await this.writeFile(this.getPath(this.filename), s);

    // Write a secondary file for archival
    let filename = `${this.filename}.${Date.now()}`;
    await this.writeFile(this.getArchivePath(filename), s);
  }

  getPath(filename) {
    return `${this.outputDirectory}/${filename}.json`;
  }

  getArchivePath(filename) {
    return `${this.archiveOutputDirectory}/${filename}.json`;
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

  // Calendar output

  async updateCalendarEvents(data, images) {
    const events = this.getCalendarEntries(data);
    if (!events) return;

    const ical = await this.getiCalData(events, images);
    await this.writeFile(this.getCalendarPath(this.calendarFilename ?? this.filename), ical);
  }

  getCalendarPath(filename) {
    return `${this.outputDirectory}/${filename}.ics`;
  }

  getCalendarEntries(data) {
    //
  }

  async getiCalData(events, images) {
    // Create a calendar object
    const calendar = new ical({
      name: this.calendarName ?? this.name,
      url: process.env.SITE_URL,
      prodId: {
        company: 'Splatoon3.ink',
        product: 'Splatoon3.ink',
        language: 'EN',
      },
      timezone: 'UTC',
    });

    // Create a map of image URLs to image data
    const imageData = {};

    // Add event entries
    for (let event of events) {
      calendar.createEvent(({
        id: event.id,
        summary: event.title,
        start: event.start,
        end: event.end,
        url: event.url,
        attachments: [event.imageUrl],
      }));

      const filename = images[event.imageUrl];
      if (filename) {
        const data = await fs.readFile(this.imageProcessor.localPath(filename));
        imageData[event.imageUrl] = data;
      }
    }

    // Convert the calendar to an ICS string
    let ics = calendar.toString();

    // Embed image attachments
    ics = ics.replaceAll(/^ATTACH:((.|\r\n )*)$/gm, (match, url) => {
      url = url.replaceAll('\r\n ', '');

      const filename = images[url];
      const data = imageData[url];
      if (!filename || !data) return match;

      const ical = `ATTACH;ENCODING=BASE64;VALUE=BINARY;X-APPLE-FILENAME=${path.basename(filename)}:${data.toString('base64')}`;

      return ical.replace(/(.{72})/g, '$1\r\n ').trim();
    });

    return ics;
  }
}
