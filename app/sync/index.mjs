import S3Syncer from './S3Syncer.mjs';
import R2Syncer from './R2Syncer.mjs';
import CloudflareCachePurger from './CloudflareCachePurger.mjs';

function cachePurger() {
  const zoneId = process.env.CLOUDFLARE_CACHE_PURGE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_CACHE_PURGE_API_TOKEN;

  if (!zoneId && !apiToken) return;

  return new CloudflareCachePurger({
    zoneId,
    apiToken,
    hosts: (process.env.CLOUDFLARE_CACHE_PURGE_HOSTS ?? '')
      .split(',').map(host => host.trim()).filter(Boolean),
  });
}

export function canSyncS3() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_S3_PRIVATE_BUCKET
  );
}

function r2Configuration() {
  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
  };
}

export function canUploadR2() {
  return Object.values(r2Configuration()).every(Boolean);
}

export function canUpload() {
  return canSyncS3() || canUploadR2();
}

export async function upload() {
  // Validate purge settings before starting uploads to either destination.
  const purger = canUploadR2() ? cachePurger() : undefined;
  let uploads = [];

  if (canSyncS3()) {
    uploads.push((new S3Syncer).upload());
  }
  if (canUploadR2()) {
    uploads.push((new R2Syncer({
      config: r2Configuration(),
      cachePurger: purger,
    })).upload());
  }

  if (uploads.length === 0) {
    console.warn('Missing object storage connection parameters');
  }

  await Promise.all(uploads);
}

async function doSync(download, shouldUpload) {
  if (download) {
    if (canSyncS3()) {
      console.info('Downloading files...');
      await (new S3Syncer).download();
    } else {
      console.warn('Missing S3 connection parameters for download');
    }
  }

  if (shouldUpload) {
    console.info('Uploading files...');
    await upload();
  }
}

export function sync() {
  return doSync(true, true);
}

export function syncUpload() {
  return doSync(false, true);
}

export function syncDownload() {
  return doSync(true, false);
}
