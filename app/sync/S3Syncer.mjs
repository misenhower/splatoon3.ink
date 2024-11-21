import path  from 'path';
import { S3Client }  from '@aws-sdk/client-s3';
import { S3SyncClient }  from 's3-sync-client';
import mime  from 'mime-types';

export default class S3Syncer
{
  download() {
    this.log('Downloading files...');

    return Promise.all([
      this.syncClient.sync(this.publicBucket, `${this.localPath}/dist`, {
        filters: this.filters,
      }),
      this.syncClient.sync(this.privateBucket, `${this.localPath}/storage`, {
        filters: this.privateFilters
      }),
    ]);
  }

  upload() {
    this.log('Uploading files...');

    return Promise.all([
      this.syncClient.sync(`${this.localPath}/dist`, this.publicBucket, {
        filters: this.filters,
        commandInput: input => ({
          ACL: 'public-read',
          ContentType: mime.lookup(input.Key),
          CacheControl: input.Key.startsWith('data/')
            ? 'no-cache, stale-while-revalidate=5, stale-if-error=86400'
            : undefined,
        }),
      }),
      this.syncClient.sync(`${this.localPath}/storage`, this.privateBucket, {
        filters: this.privateFilters,
      }),
    ]);
  }

  get s3Client() {
    return this._s3Client ??= new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /** @member {S3SyncClient} */
  get syncClient() {
    return this._syncClient ??= new S3SyncClient({ client: this.s3Client });
  }

  get publicBucket() {
    return `s3://${process.env.AWS_S3_BUCKET}`;
  }

  get privateBucket() {
    return `s3://${process.env.AWS_S3_PRIVATE_BUCKET}`;
  }

  get localPath() {
    return path.resolve('.');
  }

  get filters() {
    return [
      { exclude: () => true }, // Exclude everything by default
      { include: (key) => key.startsWith('assets/splatnet/') },
      { include: (key) => key.startsWith('data/') },
      { exclude: (key) => key.startsWith('data/archive/') },
      { include: (key) => key.startsWith('status-screenshots/') },
    ];
  }

  get privateFilters() {
    return [
      { exclude: (key) => key.startsWith('archive/') },
    ];
  }

  log(message) {
    console.log(`[S3] ${message}`);
  }
}
