import ical from 'ical-generator';
import pFilter from 'p-filter';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import SplatNet3Client from '../../splatnet/SplatNet3Client.mjs';
import ImageProcessor from '../ImageProcessor.mjs';
import RunLimits from '../RunLimits.mjs';
import NsoClient from '../../splatnet/NsoClient.mjs';
import { locales, regionalLocales, defaultLocale } from '../../../src/common/i18n.mjs';
import { LocalizationProcessor } from '../LocalizationProcessor.mjs';
import jsonpath from '../../common/jsonpath.mjs';
import { deriveId, getDateParts, getTopOfCurrentHour } from '../../common/util.mjs';
import { storage } from '../../common/storage/index.mjs';
export default class DataUpdater
{
  name = null;
  filename = null;
  directory = null;
  calendarName = null;
  calendarFilename = null;
  // Public storage key prefix for the published files
  outputDirectory = 'data';
  archiveOnePerHour = true;

  imagePaths = [];
  derivedIds = [];
  localizations = [];

  settings = {};

  /** @type {RunLimits} Shared by the updaters in one run (see app/data/index.mjs) */
  limits = new RunLimits;

  constructor(region = null) {
    this.selectedRegion = region;
    this.nsoClient = NsoClient.make(region);
  }

  get imageProcessor() {
    if (this._imageProcessor?.limits !== this.limits) {
      this._imageProcessor = new ImageProcessor(this.limits);
    }

    return this._imageProcessor;
  }

  get region() {
    return this.nsoClient.region;
  }

  get locales() {
    return this.selectedRegion
      ? regionalLocales[this.region]
      : locales;
  }

  get defaultLocale() {
    return this.selectedRegion
      ? this.locales[0]
      : defaultLocale;
  }

  /** @type {ReturnType<typeof prefixedConsole>} */
  get console() {
    this._console ??= prefixedConsole('Updater', this.region, this.name);

    return this._console;
  }

  splatnet(locale = null) {
    locale ??= this.defaultLocale;

    return new SplatNet3Client(this.nsoClient, locale.code, { requestLimit: this.limits.requests });
  }

  async shouldUpdate() {
    return true;
  }

  async updateIfNeeded() {
    if (!(await this.shouldUpdate())) {
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
    await this.downloadImages(data);

    // Write the data to disk
    await this.saveData(data);

    // Update iCal data
    await this.updateCalendarEvents(data);

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
    // Without rules there is nothing to record; skipping also avoids rewriting the shared
    // locale files from updaters that run alongside the ones that own them.
    if (!this.localizations.length) {
      return;
    }

    // Save localizations for the initial locale
    let processor = new LocalizationProcessor(initialLocale, this.localizations);
    await processor.updateLocalizations(data);

    if (this.settings.disableLocalizations) {
      return;
    }

    // Retrieve data for missing languages
    let processors = this.locales.filter(l => l !== initialLocale)
      .map(l => new LocalizationProcessor(l, this.localizations));
    let missing = await pFilter(processors, p => p.hasMissingLocalizations(data));

    if (missing.length > 0) {
      await Promise.all(missing.map(async (processor) => {
        let regionalData = await this.getData(processor.locale);
        this.deriveIds(regionalData);
        await processor.updateLocalizations(regionalData);

        this.console.info(`Retrieved localized data for: ${processor.locale.code}`);
      }));
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

    await this.imageProcessor.onIdle();

    return images;
  }

  // File handling

  async saveData(data) {
    let s = await this.formatDataForWrite(data);

    await storage().public.writeText(this.getPath(this.filename), s);

    // Write a secondary file for archival
    if (process.env.ARCHIVE_DATA) {
      await storage().archive.writeText(this.getArchivePath(this.filename), s);
    }
  }

  getPath(filename) {
    return [
      this.outputDirectory,
      this.directory,
      `${filename}.json`,
    ].filter(x => x).join('/');
  }

  getArchivePath(filename) {
    let date = new Date;
    if (this.archiveOnePerHour) {
      // We only want to store one file per hour, so start with the top of the current hour
      date = getTopOfCurrentHour(date);
    }

    let { year, month, day, hour, minute, second } = getDateParts(date);

    return `${year}-${month}-${day}.${hour}-${minute}-${second}.${filename}.json`;
  }

  async formatDataForWrite(data) {
    // If we're running in debug mode, format the JSON output so it's easier to read
    let debug = !!process.env.DEBUG;
    let space = debug ? 2 : undefined;

    return JSON.stringify(data, undefined, space);
  }

  /**
   * Whether a published file is older than the cutoff (or does not exist yet).
   * @param {string} key Public storage key
   * @param {Date} cutoff
   * @returns {Promise<boolean>} True if the file should be refreshed
   */
  async olderThan(key, cutoff) {
    let modified = await storage().public.lastModified(key);

    return !modified || modified < cutoff;
  }

  // Calendar output

  async updateCalendarEvents(data) {
    const events = this.getCalendarEntries(data);
    if (!events) return;

    const ical = await this.getiCalData(events);
    await storage().public.writeText(this.getCalendarPath(this.calendarFilename ?? this.filename), ical);
  }

  getCalendarPath(filename) {
    return `${this.outputDirectory}/${filename}.ics`;
  }

  getCalendarEntries(data) {
    //
  }

  async getiCalData(events) {
    // Create a calendar object
    const calendar = ical({
      name: this.calendarName ?? this.name,
      url: process.env.SITE_URL,
      prodId: {
        company: 'Splatoon3.ink',
        product: 'Splatoon3.ink',
        language: 'EN',
      },
      timezone: 'UTC',
    });

    // Add event entries
    for (let event of events) {
      let calEvent = calendar.createEvent({
        id: event.id,
        summary: event.title,
        start: event.start,
        end: event.end,
        url: event.url,
      });
      calEvent.createAttachment(event.imageUrl);
    }

    // Convert the calendar to an ICS string
    let ics = calendar.toString();

    return ics;
  }
}
