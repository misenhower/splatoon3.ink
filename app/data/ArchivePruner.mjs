import * as Sentry from '@sentry/node';
import {
  DeleteObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import ArchiveInventory from './ArchiveInventory.mjs';
import RemoteArchiveVerifier from './RemoteArchiveVerifier.mjs';

const retentionPeriod = 7 * 24 * 60 * 60 * 1000;

export function pruneArchives(maxDays = Infinity, dryRun = false) {
  let pruner = new ArchivePruner;
  pruner.maxDays = maxDays;
  pruner.dryRun = dryRun;

  return pruner.process();
}

export function pruneArchivesFromCli(args) {
  let dryRun = false;
  let maxDays = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--max-days' && /^\d+$/.test(args[i + 1])) {
      maxDays = Number(args[++i]);
    } else {
      throw new Error(
        'Usage: npm run data:archive:prune -- [--dry-run] [--max-days DAYS]',
      );
    }
  }

  if (maxDays < 1) {
    throw new Error('--max-days must be at least 1');
  }

  return pruneArchives(maxDays, dryRun);
}

export default class ArchivePruner
{
  dryRun = false;
  maxDays = Infinity;

  constructor(s3Client, remoteArchiveVerifier, archiveInventory) {
    this._client = s3Client;
    this._remoteArchiveVerifier = remoteArchiveVerifier;
    this._archiveInventory = archiveInventory;
  }

  async process() {
    if (!this.canRun) {
      this.console.log('Skipping archive pruner');

      return;
    }

    let currentDate;

    try {
      let candidates = await this.getCandidates();
      this.console.log(`Found ${candidates.length} dates to verify`);
      let processedDays = 0;

      for (let candidate of candidates) {
        if (processedDays >= this.maxDays) {
          break;
        }

        currentDate = candidate.date;
        let manifest = await this.remoteArchiveVerifier.getManifest(candidate);
        if (!this.dryRun && !this.isEligible(manifest)) {
          this.console.log(
            `Skipping ${candidate.date}; not eligible for deletion until ${this.eligibleDate(manifest)}`,
          );
          continue;
        }

        let sourceObjects = await this.archiveInventory.getSourceObjects(candidate.prefix);
        await this.remoteArchiveVerifier.verify(candidate, sourceObjects, manifest);
        processedDays++;

        if (this.dryRun) {
          if (this.isEligible(manifest)) {
            this.console.log(
              `Verified ${candidate.date}; would delete ${this.fileCount(sourceObjects)}`,
            );
          } else {
            this.console.log(
              `Verified ${candidate.date}; not eligible for deletion until ${this.eligibleDate(manifest)}`,
            );
          }
          continue;
        }

        let currentObjects = await this.archiveInventory.getSourceObjects(candidate.prefix);
        this.assertObjectsUnchanged(sourceObjects, currentObjects, candidate.date);
        await this.deleteObjects(currentObjects);
        this.console.log(`Pruned ${candidate.date}; deleted ${this.fileCount(currentObjects)}`);
      }

      this.console.log(
        this.dryRun
          ? `Verified ${processedDays} daily archives`
          : `Pruned ${processedDays} daily archives`,
      );
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
  }

  get console() {
    this._console ??= prefixedConsole('Archive Pruner');

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

  get remoteArchiveVerifier() {
    return this._remoteArchiveVerifier ??= new RemoteArchiveVerifier(this.s3Client);
  }

  get archiveInventory() {
    return this._archiveInventory ??= new ArchiveInventory(this.s3Client);
  }

  async getCandidates() {
    return (await this.archiveInventory.getDates())
      .filter(item => item.hasSource && item.hasArchive);
  }

  async deleteObjects(objects) {
    for (let i = 0; i < objects.length; i += 1000) {
      let batch = objects.slice(i, i + 1000);
      let response = await this.s3Client.send(new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
        Delete: {
          Objects: batch.map(object => ({ Key: object.key })),
          Quiet: true,
        },
      }));
      if (response.Errors?.length) {
        let failures = response.Errors.map(error => `${error.Key}: ${error.Code}`).join(', ');
        throw new Error(`Could not delete archive source files: ${failures}`);
      }
    }
  }

  isEligible(manifest) {
    return Date.parse(manifest.createdAt) <= Date.now() - retentionPeriod;
  }

  eligibleDate(manifest) {
    return new Date(Date.parse(manifest.createdAt) + retentionPeriod).toISOString().slice(0, 10);
  }

  assertObjectsUnchanged(expected, actual, date) {
    let unchanged = expected.length === actual.length
      && expected.every((object, index) => {
        let current = actual[index];

        return object.key === current.key
          && object.bytes === current.bytes
          && object.etag === current.etag;
      });
    if (!unchanged) {
      throw new Error(`Source files changed while verifying ${date}`);
    }
  }

  fileCount(objects) {
    return `${objects.length} ${objects.length === 1 ? 'file' : 'files'}`;
  }

}
