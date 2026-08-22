import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import * as Sentry from '@sentry/node';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { createArchiveManifest } from './ArchiveManifest.mjs';
import TarZstdWriter from './TarZstdWriter.mjs';

const downloadLimit = 5;
const quietPeriod = 30 * 60 * 1000;

export function compressArchives(maxDays = Infinity, dryRun = false, rebuildBefore = null) {
  let compressor = new ArchiveCompressor;
  compressor.maxDays = maxDays;
  compressor.dryRun = dryRun;
  compressor.rebuildBefore = rebuildBefore;

  return compressor.process();
}

export function compressArchivesFromCli(args) {
  let dryRun = false;
  let maxDays = Infinity;
  let rebuildBefore = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--rebuild-before' && Number.isFinite(Date.parse(args[i + 1]))) {
      rebuildBefore = Date.parse(args[++i]);
    } else if (args[i] === '--max-days' && /^\d+$/.test(args[i + 1])) {
      maxDays = Number(args[++i]);
    } else {
      throw new Error(
        'Usage: npm run data:archive:compress -- '
        + '[--dry-run] [--max-days DAYS] [--rebuild-before TIMESTAMP]',
      );
    }
  }

  if (maxDays < 1) {
    throw new Error('--max-days must be at least 1');
  }

  return compressArchives(maxDays, dryRun, rebuildBefore);
}

export default class ArchiveCompressor
{
  dryRun = false;
  maxDays = Infinity;
  rebuildBefore = null;

  constructor(s3Client, archiveWriter = new TarZstdWriter) {
    this._client = s3Client;
    this.archiveWriter = archiveWriter;
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

  // Archive compression

  async previewDate(candidate) {
    let objects = await this.getReadyObjects(candidate);
    if (!objects) {
      return false;
    }

    this.console.log(
      `Would ${candidate.exists ? 'replace' : 'create'} `
      + `${candidate.archiveKey} and ${candidate.manifestKey} `
      + `from ${objects.length} files`,
    );

    return true;
  }

  async archiveDate(candidate) {
    let objects = await this.getReadyObjects(candidate);
    if (!objects) {
      return false;
    }

    let temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `splatoon3ink-${candidate.date}-`),
    );
    let sourceDirectory = path.join(temporaryDirectory, 'source');
    let archivePath = path.join(temporaryDirectory, `${candidate.date}.tar.zst`);

    try {
      await fs.mkdir(sourceDirectory);
      this.console.log(`Downloading ${objects.length} files for ${candidate.date}`);
      let files = await this.downloadObjects(candidate.prefix, objects, sourceDirectory);
      files.sort((a, b) => a.path.localeCompare(b.path));

      this.console.log(`Compressing ${candidate.date}`);
      await this.archiveWriter.write(sourceDirectory, archivePath, files.map(file => file.path));

      let archive = {
        path: candidate.archiveKey,
        bytes: (await fs.stat(archivePath)).size,
        hash: `sha256:${await this.hashFile(archivePath)}`,
      };
      let manifest = createArchiveManifest(candidate.date, archive, files);

      this.console.log(`${candidate.exists ? 'Replacing' : 'Uploading'} ${candidate.archiveKey}`);
      await this.upload(candidate.archiveKey, await fs.readFile(archivePath), 'application/zstd');
      await this.upload(
        candidate.manifestKey,
        Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
        'application/json',
      );

      return true;
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  }

  async getReadyObjects(candidate) {
    let objects = await this.getSourceObjects(candidate.prefix);
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

  async downloadObjects(prefix, objects, sourceDirectory) {
    let files = [];
    let nextObject = 0;
    let error;
    let worker = async () => {
      while (!error && nextObject < objects.length) {
        let index = nextObject++;
        try {
          files[index] = await this.downloadObject(prefix, objects[index], sourceDirectory);
        } catch (e) {
          error ??= e;
        }
      }
    };

    let workers = Array.from({ length: Math.min(downloadLimit, objects.length) }, worker);
    await Promise.all(workers);
    if (error) {
      throw error;
    }

    return files;
  }

  async downloadObject(prefix, object, sourceDirectory) {
    let relativePath = this.relativePath(prefix, object.key);
    let destination = path.join(sourceDirectory, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    let response = await this.s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      Key: object.key,
    }));
    if (!response.Body) {
      throw new Error(`S3 returned no body for ${object.key}`);
    }

    await pipeline(response.Body, createWriteStream(destination, { flags: 'wx' }));
    let bytes = (await fs.stat(destination)).size;
    if (bytes !== object.bytes) {
      throw new Error(`Downloaded size does not match S3 listing for ${object.key}`);
    }

    return {
      path: relativePath,
      bytes,
      hash: `sha256:${await this.hashFile(destination)}`,
    };
  }

  async hashFile(file) {
    let hash = crypto.createHash('sha256');
    for await (let chunk of createReadStream(file)) {
      hash.update(chunk);
    }

    return hash.digest('hex');
  }

  async upload(key, body, contentType) {
    await this.s3Client.send(new PutObjectCommand({
      ACL: 'public-read',
      Body: body,
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      ContentLength: body.length,
      ContentType: contentType,
      Key: key,
    }));
  }

  // S3 discovery

  async getCandidates() {
    let candidates = [];
    let years = (await this.list('', '/')).prefixes.filter(prefix => /^\d{4}\/$/.test(prefix));

    for (let year of years.sort()) {
      let months = (await this.list(year, '/')).prefixes
        .filter(prefix => /^\d{4}\/\d{2}\/$/.test(prefix));

      for (let month of months.sort()) {
        let listing = await this.list(month, '/');
        let existing = new Map(listing.objects.map(object => [object.Key, object]));

        for (let prefix of listing.prefixes.sort()) {
          let date = this.dateFromPrefix(prefix);
          if (!date || date >= new Date().toISOString().slice(0, 10)) {
            continue;
          }

          let archiveKey = `${month}${date}.tar.zst`;
          let manifestKey = `${archiveKey}.manifest.json`;
          let exists = existing.has(archiveKey) && existing.has(manifestKey);
          if (exists) {
            if (this.rebuildBefore === null) {
              continue;
            }

            let modified = existing.get(manifestKey).LastModified?.getTime();
            if (!Number.isFinite(modified)) {
              throw new Error(`S3 returned incomplete metadata for ${manifestKey}`);
            }
            if (modified >= this.rebuildBefore) {
              continue;
            }
          }

          candidates.push({ archiveKey, date, exists, manifestKey, prefix });
        }
      }
    }

    return candidates.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSourceObjects(prefix) {
    let listing = await this.list(prefix);

    return listing.objects
      .filter(object => object.Key && object.Key !== prefix && !object.Key.endsWith('/'))
      .map(object => {
        if (!object.LastModified || !Number.isFinite(object.Size)) {
          throw new Error(`S3 returned incomplete metadata for ${object.Key}`);
        }

        return {
          key: object.Key,
          bytes: object.Size,
          lastModified: object.LastModified,
        };
      });
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

  // Helpers

  dateFromPrefix(prefix) {
    let match = prefix.match(/^(\d{4})\/(\d{2})\/(\d{2})\/$/);
    if (!match) {
      return null;
    }

    let date = `${match[1]}-${match[2]}-${match[3]}`;
    let parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return null;
    }

    return date;
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
