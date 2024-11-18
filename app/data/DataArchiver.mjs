import fs from 'fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import prefixedConsole from '../common/prefixedConsole.mjs';

export function archiveData() {
  return (new DataArchiver).process();
}

export default class DataArchiver
{
  inputDirectory = 'storage/archive';
  deleteAfterUpload = true;

  async process() {
    if (!this.canRun) {
      this.console.log('Skipping data archiver');

      return;
    }

    this.console.log('Archiving data...');

    for (let file of await this.getFiles()) {
      await this.processFile(file);
    }

    this.console.log('Done!');
  }

  // Properties

  get console() {
    this._console ??= prefixedConsole('Archiver');

    return this._console;
  }

  get canRun() {
    return process.env.AWS_S3_ENDPOINT
      && process.env.AWS_S3_REGION
      && process.env.AWS_S3_ARCHIVE_BUCKET
      && process.env.AWS_ACCESS_KEY_ID
      && process.env.AWS_SECRET_ACCESS_KEY;
  }

  get s3Client() {
    return this._client ??= new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // Helpers

  getFiles() {
    return fs.readdir(this.inputDirectory, { recursive: true });
  }

  async processFile(path) {
    // Get the filename from the path
    let file = path.split('/').pop();

    // Extract the date from the filename
    // Format: 2023-05-01.00-00-00.example.json
    let match = file.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!match) {
      return;
    }

    let date = match[1];
    let prefix = date.replace(/-/g, '/');

    this.console.log(`Uploading file: ${file}`);
    try {
      await this.uploadViaS3(`${this.inputDirectory}/${path}`, `${prefix}/${file}`);

      if (this.deleteAfterUpload) {
        await fs.unlink(`${this.inputDirectory}/${path}`);
      }
    } catch (e) {
      this.console.error(e);
    }
  }

  async uploadViaS3(file, destination) {
    return this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_ARCHIVE_BUCKET,
      Key: destination,
      Body: await fs.readFile(file),
      ACL: 'public-read',
      ContentType: 'application/json',
    }));
  }
}
