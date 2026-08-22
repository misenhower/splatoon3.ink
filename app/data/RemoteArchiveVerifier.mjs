import {
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { parseArchiveManifest } from './ArchiveManifest.mjs';
import ArchiveContentVerifier from './ArchiveContentVerifier.mjs';

export default class RemoteArchiveVerifier
{
  constructor(s3Client, contentVerifier = new ArchiveContentVerifier) {
    this._client = s3Client;
    this.contentVerifier = contentVerifier;
  }

  async verify(candidate, sourceObjects, manifest = null) {
    manifest ??= await this.getManifest(candidate);
    let archiveStream = await this.getArchive(candidate.archiveKey);
    await this.contentVerifier.verify(archiveStream, manifest, sourceObjects);

    return manifest;
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
}
