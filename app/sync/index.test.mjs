import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  legacyDownload: vi.fn(),
  legacyUpload: vi.fn(),
  r2Upload: vi.fn(),
}));

vi.mock('./S3Syncer.mjs', () => ({
  default: class {
    download(...args) {
      return mocks.legacyDownload(...args);
    }

    upload(...args) {
      return mocks.legacyUpload(...args);
    }
  },
}));

vi.mock('./R2Syncer.mjs', () => ({
  default: class {
    upload(...args) {
      return mocks.r2Upload(...args);
    }
  },
}));

const {
  canSyncS3,
  canUploadR2,
  syncUpload,
  upload,
} = await import('./index.mjs');

const environmentKeys = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'AWS_S3_PRIVATE_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
  'SITE_URL',
];

function configureLegacy() {
  process.env.AWS_ACCESS_KEY_ID = 'legacy-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'legacy-secret';
  process.env.AWS_S3_BUCKET = 'legacy-public';
  process.env.AWS_S3_PRIVATE_BUCKET = 'legacy-private';
}

function configureR2() {
  process.env.R2_ACCESS_KEY_ID = 'r2-key';
  process.env.R2_SECRET_ACCESS_KEY = 'r2-secret';
  process.env.R2_BUCKET = 'splatoon3-ink-assets';
  process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
  process.env.SITE_URL = 'https://splatoon3.ink';
}

describe('sync orchestration', () => {
  beforeEach(() => {
    for (let key of environmentKeys) {
      delete process.env[key];
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (let key of environmentKeys) {
      delete process.env[key];
    }
  });

  it('detects legacy and R2 configuration independently', () => {
    expect(canSyncS3()).toBe(false);
    expect(canUploadR2()).toBe(false);

    configureR2();
    expect(canSyncS3()).toBe(false);
    expect(canUploadR2()).toBe(true);

    configureLegacy();
    expect(canSyncS3()).toBe(true);
    expect(canUploadR2()).toBe(true);
  });

  it('uploads to both configured public destinations', async () => {
    configureLegacy();
    configureR2();

    await upload();

    expect(mocks.legacyUpload).toHaveBeenCalledOnce();
    expect(mocks.r2Upload).toHaveBeenCalledOnce();
  });

  it('allows upload-only operation when only R2 is configured', async () => {
    configureR2();

    await syncUpload();

    expect(mocks.legacyUpload).not.toHaveBeenCalled();
    expect(mocks.r2Upload).toHaveBeenCalledOnce();
  });
});
