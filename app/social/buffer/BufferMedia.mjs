import { storage } from '../../common/storage/index.mjs';

/**
 * Hosts post images for Buffer, which fetches them by URL. Images go to public storage, so
 * this needs storage served at a public HTTPS URL (the Worker's R2 bucket); the local Node
 * runner writes to dist/ and cannot host them.
 */
export default class BufferMedia {
  get publicUrl() {
    return storage().public.publicUrl;
  }

  canUpload() {
    return !!this.publicUrl;
  }

  async upload(media) {
    if (!this.canUpload()) {
      throw new Error('Buffer images require public storage with a public URL');
    }

    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg' }[media.type];

    if (!extension || !media.file?.byteLength) {
      throw new Error('Buffer requires a nonempty PNG or JPEG image');
    }

    const publicUrl = new URL(this.publicUrl);

    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password
      || publicUrl.search || publicUrl.hash) {
      throw new Error('The public storage URL must be an HTTPS base URL without credentials, query, or fragment');
    }

    // Production R2 lifecycle rules delete all temporary images under this prefix
    // after seven days, leaving time for Buffer to fetch queued posts' images.
    const key = `buffer-twitter/${crypto.randomUUID()}.${extension}`;
    publicUrl.pathname = `${publicUrl.pathname.replace(/\/+$/, '')}/${key}`;

    await storage().public.writeBytes(key, media.file, {
      contentType: media.type,
      cacheControl: 'private, no-store',
    });

    return { key, url: publicUrl.href };
  }
}
