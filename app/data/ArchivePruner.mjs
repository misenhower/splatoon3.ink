import path from 'node:path';
import * as Sentry from '@sentry/node';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { parseArchiveManifest } from './ArchiveManifest.mjs';
import ArchiveVerifier from './ArchiveVerifier.mjs';

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

  constructor(s3Client, archiveVerifier = new ArchiveVerifier) {
    this._client = s3Client;
    this.archiveVerifier = archiveVerifier;
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
        let manifest = await this.getManifest(candidate);
        if (!this.dryRun && !this.isEligible(manifest)) {
          this.console.log(
            `Skipping ${candidate.date}; not eligible for deletion until ${this.eligibleDate(manifest)}`,
          );
          continue;
        }

        let sourceObjects = await this.getSourceObjects(candidate.prefix);
        let archiveStream = await this.getArchive(candidate.archiveKey);
        await this.archiveVerifier.verify(archiveStream, manifest, sourceObjects);
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

        let currentObjects = await this.getSourceObjects(candidate.prefix);
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

  async getCandidates() {
    let candidates = [];
    let years = (await this.list('', '/')).prefixes.filter(prefix => /^\d{4}\/$/.test(prefix));

    for (let year of years.sort()) {
      let months = (await this.list(year, '/')).prefixes
        .filter(prefix => /^\d{4}\/\d{2}\/$/.test(prefix));

      for (let month of months.sort()) {
        let listing = await this.list(month, '/');
        let existing = new Set(listing.objects.map(object => object.Key));

        for (let prefix of listing.prefixes.sort()) {
          let date = this.dateFromPrefix(prefix);
          if (!date) {
            continue;
          }

          let archiveKey = `${month}${date}.tar.zst`;
          let manifestKey = `${archiveKey}.manifest.json`;
          let hasArchive = existing.has(archiveKey);
          let hasManifest = existing.has(manifestKey);
          if (hasArchive !== hasManifest) {
            throw new Error(`Archive and manifest are incomplete for ${date}`);
          }
          if (hasArchive) {
            candidates.push({ archiveKey, date, manifestKey, prefix });
          }
        }
      }
    }

    return candidates.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getManifest(candidate) {
    let response = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      Key: candidate.manifestKey,
    }));
    if (!response.Body) {
      throw new Error(`S3 returned no body for ${candidate.manifestKey}`);
    }

    return parseArchiveManifest(
      await response.Body.transformToString(),
      candidate.archiveKey,
    );
  }

  async getArchive(key) {
    let response = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      Key: key,
    }));
    if (!response.Body) {
      throw new Error(`S3 returned no body for ${key}`);
    }

    return response.Body;
  }

  async getSourceObjects(prefix) {
    let listing = await this.list(prefix);

    return listing.objects
      .filter(object => object.Key && object.Key !== prefix && !object.Key.endsWith('/'))
      .map(object => {
        if (!Number.isFinite(object.Size) || typeof object.ETag !== 'string') {
          throw new Error(`S3 returned incomplete metadata for ${object.Key}`);
        }

        return {
          path: this.relativePath(prefix, object.Key),
          bytes: object.Size,
          etag: object.ETag,
          key: object.Key,
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
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

  async list(prefix, delimiter) {
    let prefixes = [];
    let objects = [];
    let continuationToken;

    do {
      let response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
        ContinuationToken: continuationToken,
        Delimiter: delimiter,
        Prefix: prefix,
      }));
      prefixes.push(...(response.CommonPrefixes ?? []).map(item => item.Prefix).filter(Boolean));
      objects.push(...(response.Contents ?? []));

      if (response.IsTruncated && !response.NextContinuationToken) {
        throw new Error(`S3 listing for ${prefix} was truncated without a continuation token`);
      }
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return { objects, prefixes };
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

  dateFromPrefix(prefix) {
    let match = prefix.match(/^(\d{4})\/(\d{2})\/(\d{2})\/$/);
    if (!match) {
      return null;
    }

    let date = `${match[1]}-${match[2]}-${match[3]}`;
    let parsedDate = new Date(`${date}T00:00:00.000Z`);

    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date
      ? date
      : null;
  }

  relativePath(prefix, key) {
    let relativePath = key.slice(prefix.length);
    if (!key.startsWith(prefix)
      || !relativePath
      || path.posix.normalize(relativePath) !== relativePath
      || path.posix.isAbsolute(relativePath)
      || relativePath.split('/').includes('..')) {
      throw new Error(`Invalid archive object path: ${key}`);
    }

    return relativePath;
  }
}
