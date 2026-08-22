import * as Sentry from '@sentry/node';
import { S3Client } from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ArchiveBuilder from './ArchiveBuilder.mjs';
import ArchiveInventory from './ArchiveInventory.mjs';

const quietPeriod = 30 * 60 * 1000;

export function compressArchives(maxDays = Infinity, dryRun = false) {
  let compressor = new ArchiveCompressor;
  compressor.maxDays = maxDays;
  compressor.dryRun = dryRun;

  return compressor.process();
}

export function compressArchivesFromCli(args) {
  let dryRun = false;
  let maxDays = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--max-days' && /^\d+$/.test(args[i + 1])) {
      maxDays = Number(args[++i]);
    } else {
      throw new Error(
        'Usage: npm run data:archive:compress -- [--dry-run] [--max-days DAYS]',
      );
    }
  }

  if (maxDays < 1) {
    throw new Error('--max-days must be at least 1');
  }

  return compressArchives(maxDays, dryRun);
}

export default class ArchiveCompressor
{
  dryRun = false;
  maxDays = Infinity;

  constructor(s3Client, archiveBuilder, archiveInventory) {
    this._client = s3Client;
    this._archiveBuilder = archiveBuilder;
    this._archiveInventory = archiveInventory;
  }

  async process() {
    if (!this.canRun) {
      this.console.log('Skipping archive compressor');

      return;
    }

    let currentDate;
    let compressed = 0;

    try {
      let candidates = await this.getCandidates();
      this.console.log(`Found ${candidates.length} dates to archive`);

      for (let candidate of candidates) {
        if (compressed >= this.maxDays) {
          break;
        }

        currentDate = candidate.date;
        let completed = this.dryRun
          ? await this.previewDate(candidate)
          : await this.archiveDate(candidate);
        if (completed) {
          compressed++;
        }
      }
    } catch (e) {
      this.console.error(e);
      Sentry.withScope(scope => {
        if (currentDate) {
          scope.setTag('archive.date', currentDate);
        }
        Sentry.captureException(e);
      });
      await Sentry.flush(2000).catch(() => {});
      throw e;
    }

    this.console.log(
      this.dryRun
        ? `Would compress ${compressed} daily archives`
        : `Compressed ${compressed} daily archives`,
    );
  }

  // Properties

  get console() {
    this._console ??= prefixedConsole('Archive Compressor');

    return this._console;
  }

  get canRun() {
    return process.env.AWS_S3_ENDPOINT
      && process.env.AWS_REGION
      && process.env.AWS_S3_ARCHIVE_BUCKET
      && process.env.AWS_ACCESS_KEY_ID
      && process.env.AWS_SECRET_ACCESS_KEY;
  }

  get s3Client() {
    return this._client ??= new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  get archiveBuilder() {
    return this._archiveBuilder ??= new ArchiveBuilder(this.s3Client);
  }

  get archiveInventory() {
    return this._archiveInventory ??= new ArchiveInventory(this.s3Client);
  }

  // Archive compression

  async previewDate(candidate) {
    let objects = await this.getReadyObjects(candidate);
    if (!objects) {
      return false;
    }

    this.console.log(
      `Would create ${candidate.archiveKey} and ${candidate.manifestKey} `
      + `from ${objects.length} files`,
    );

    return true;
  }

  async archiveDate(candidate) {
    let objects = await this.getReadyObjects(candidate);
    if (!objects) {
      return false;
    }

    this.console.log(`Creating ${candidate.archiveKey}`);
    await this.archiveBuilder.build(candidate, objects);

    return true;
  }

  async getReadyObjects(candidate) {
    let objects = await this.archiveInventory.getSourceObjects(candidate.prefix);
    if (objects.length === 0) {
      return null;
    }

    let newestObject = Math.max(...objects.map(object => object.lastModified.getTime()));
    if (newestObject > Date.now() - quietPeriod) {
      this.console.log(`Skipping ${candidate.date}; its source files are still changing`);

      return null;
    }

    return objects;
  }

  // S3 discovery

  async getCandidates() {
    let today = new Date().toISOString().slice(0, 10);

    return (await this.archiveInventory.getDates())
      .filter(item => item.hasSource && !item.hasArchive && item.date < today);
  }

}
