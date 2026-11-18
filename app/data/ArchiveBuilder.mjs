import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { createArchiveManifest } from './ArchiveManifest.mjs';
import TarZstdWriter from './TarZstdWriter.mjs';

const downloadLimit = 5;

// A connection to the Space can be reset partway through a file ("aborted", ECONNRESET), and the
// SDK does not retry a response body that breaks off, so each file is tried a few times.
const downloadAttempts = 4;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export default class ArchiveBuilder
{
  // The wait before the second attempt at a file; later attempts wait longer.
  retryDelayMs = 2000;

  constructor(s3Client, archiveWriter = new TarZstdWriter) {
    this._client = s3Client;
    this.archiveWriter = archiveWriter;
  }

  async build(candidate, objects) {
    let temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `splatoon3ink-${candidate.date}-`),
    );
    let sourceDirectory = path.join(temporaryDirectory, 'source');
    let archivePath = path.join(temporaryDirectory, `${candidate.date}.tar.zst`);

    try {
      await fs.mkdir(sourceDirectory);
      this.console.log(`Downloading ${objects.length} files for ${candidate.date}`);
      let files = await this.downloadObjects(objects, sourceDirectory);
      files.sort((a, b) => a.path.localeCompare(b.path));

      this.console.log(`Compressing ${candidate.date}`);
      await this.archiveWriter.write(sourceDirectory, archivePath, files.map(file => file.path));

      let archive = {
        path: candidate.archiveKey,
        bytes: (await fs.stat(archivePath)).size,
        hash: `sha256:${await this.hashFile(archivePath)}`,
      };
      let manifest = createArchiveManifest(candidate.date, archive, files);

      await this.upload(candidate.archiveKey, await fs.readFile(archivePath), 'application/zstd');
      await this.upload(
        candidate.manifestKey,
        Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
        'application/json',
      );
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  }

  get console() {
    this._console ??= prefixedConsole('Archive Builder');

    return this._console;
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

  async downloadObjects(objects, sourceDirectory) {
    let files = [];
    let nextObject = 0;
    let error;
    let worker = async () => {
      while (!error && nextObject < objects.length) {
        let index = nextObject++;
        try {
          files[index] = await this.downloadObject(objects[index], sourceDirectory);
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

  async downloadObject(object, sourceDirectory) {
    let destination = path.join(sourceDirectory, object.path);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.downloadObjectOnce(object, destination);
      } catch (e) {
        await fs.rm(destination, { force: true });

        if (attempt >= downloadAttempts) {
          throw e;
        }

        this.console.warn(
          `Download of ${object.key} failed (${e?.code ?? e?.name ?? 'error'}: ${e?.message ?? e}), attempt ${attempt} of ${downloadAttempts}; retrying`,
        );
        await wait(this.retryDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  async downloadObjectOnce(object, destination) {
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
      path: object.path,
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

}
