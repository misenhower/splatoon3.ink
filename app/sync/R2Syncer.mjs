import path from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { S3SyncClient } from 's3-sync-client';
import mime from 'mime-types';

const dataCacheControl = 'no-cache, stale-while-revalidate=5, stale-if-error=86400';
const publicDataExtensions = ['.ics', '.json'];

function isImage(key) {
  let contentType = mime.lookup(key);
  return typeof contentType === 'string' && contentType.startsWith('image/');
}

function isPublicData(key) {
  return publicDataExtensions.some(extension => key.endsWith(extension));
}

export default class R2Syncer
{
  constructor({ config = {}, localPath, s3Client, syncClient } = {}) {
    this.config = config;
    this._s3Client = s3Client;
    this._syncClient = syncClient;
    this._localPath = localPath;
  }

  async upload() {
    this.log('Uploading files...');

    return this.syncClient.sync(this.localPath, this.publicBucket, {
      filters: this.filters,
      relocations: this.relocations,
      commandInput: input => this.commandInput(input),
    });
  }

  commandInput(input) {
    let result = {
      ContentType: mime.lookup(input.Key) || undefined,
      CacheControl: input.Key.startsWith('data/')
        ? dataCacheControl
        : undefined,
    };

    return result;
  }

  get s3Client() {
    return this._s3Client ??= new S3Client({
      endpoint: this.config.endpoint,
      region: 'auto',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  /** @member {S3SyncClient} */
  get syncClient() {
    return this._syncClient ??= new S3SyncClient({ client: this.s3Client });
  }

  get publicBucket() {
    return `s3://${this.config.bucket}`;
  }

  get localPath() {
    return this._localPath ?? path.resolve('dist');
  }

  get filters() {
    return [
      { exclude: () => true },
      { include: key => key.startsWith('assets/splatnet/') && isImage(key) },
      { include: key => key.startsWith('data/') && isPublicData(key) },
      { exclude: key => key.startsWith('data/archive/') },
      { include: key => key.startsWith('status-screenshots/') && isImage(key) },
    ];
  }

  get relocations() {
    return [key => key.startsWith('assets/splatnet/')
      ? key.slice('assets/'.length)
      : key];
  }

  log(message) {
    console.log(`[R2] ${message}`);
  }
}
