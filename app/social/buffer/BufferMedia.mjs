import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export default class BufferMedia {
  canUpload() {
    return ['R2_ENDPOINT', 'R2_BUCKET', 'R2_PUBLIC_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
      .every(key => !!process.env[key]);
  }

  get s3() {
    return this._s3 ??= new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      region: 'auto',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(media) {
    if (!this.canUpload()) {
      throw new Error('Buffer images require R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_URL, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY');
    }

    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg' }[media.type];

    if (!extension || !media.file?.byteLength) {
      throw new Error('Buffer requires a nonempty PNG or JPEG image');
    }

    const endpoint = new URL(process.env.R2_ENDPOINT);

    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
      throw new Error('Buffer images require an HTTPS R2 endpoint');
    }

    const publicUrl = new URL(process.env.R2_PUBLIC_URL);

    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password
      || publicUrl.search || publicUrl.hash) {
      throw new Error('R2_PUBLIC_URL must be an HTTPS base URL without credentials, query, or fragment');
    }

    // Production R2 lifecycle rules delete all temporary images under this prefix
    // after seven days, leaving time for Buffer to fetch queued posts' images.
    const key = `buffer-twitter/${randomUUID()}.${extension}`;
    const object = { Bucket: process.env.R2_BUCKET, Key: key };
    publicUrl.pathname = `${publicUrl.pathname.replace(/\/+$/, '')}/${key}`;

    await this.s3.send(new PutObjectCommand({
      ...object,
      Body: Buffer.from(media.file),
      ContentType: media.type,
      CacheControl: 'private, no-store',
    }));

    return { key, url: publicUrl.href };
  }
}
