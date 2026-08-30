import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3SyncClient } from 's3-sync-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import R2Syncer from './R2Syncer.mjs';

class FakeSyncClient
{
  calls = [];

  async sync(source, target, options) {
    this.calls.push({ options, source, target });
    return { created: [], deleted: [], updated: [] };
  }
}

class FakeS3Client
{
  uploads = [];

  async send(command) {
    if (command instanceof ListObjectsV2Command) {
      return { Contents: [], IsTruncated: false };
    }

    if (command instanceof PutObjectCommand) {
      this.uploads.push({
        ...command.input,
        Body: await streamText(command.input.Body),
      });
      return {};
    }

    throw new Error(`Unexpected command: ${command.constructor.name}`);
  }
}

function isIncluded(filters, key) {
  let excluded = false;

  for (let filter of filters) {
    if (!excluded && filter.exclude) {
      excluded = filter.exclude(key);
    }
    if (excluded && filter.include) {
      excluded = !filter.include(key);
    }
  }

  return !excluded;
}

async function streamText(stream) {
  if (Buffer.isBuffer(stream)) {
    return stream.toString();
  }

  let chunks = [];
  for await (let chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
}

describe('R2Syncer', () => {
  let temporaryDirectories = [];
  let config;

  beforeEach(() => {
    temporaryDirectories = [];
    config = {
      bucket: 'splatoon3-ink-assets',
    };
  });

  afterEach(() => {
    return Promise.all(temporaryDirectories.map(directory => fs.rm(directory, {
      force: true,
      recursive: true,
    })));
  });

  it('uploads only public data and generated images with canonical R2 keys', async () => {
    let syncClient = new FakeSyncClient;
    let syncer = new R2Syncer({ config, syncClient });

    await syncer.upload();

    expect(syncClient.calls).toHaveLength(1);
    let call = syncClient.calls[0];
    expect(call.source).toBe(path.resolve('dist'));
    expect(call.target).toBe('s3://splatoon3-ink-assets');
    expect(call.options).not.toHaveProperty('partSize');
    expect(isIncluded(call.options.filters, 'data/schedules.json')).toBe(true);
    expect(isIncluded(call.options.filters, 'data/festivals.US.ics')).toBe(true);
    expect(isIncluded(call.options.filters, 'data/archive/old.json')).toBe(false);
    expect(isIncluded(call.options.filters, 'data/index.html')).toBe(false);
    expect(isIncluded(call.options.filters, 'assets/splatnet/v3/stage.png')).toBe(true);
    expect(isIncluded(call.options.filters, 'assets/splatnet/.DS_Store')).toBe(false);
    expect(isIncluded(call.options.filters, 'assets/main.js')).toBe(false);
    expect(isIncluded(call.options.filters, 'status-screenshots/schedules.png')).toBe(true);
    expect(isIncluded(call.options.filters, 'status-screenshots/index.html')).toBe(false);
    expect(call.options.relocations[0]('assets/splatnet/v3/stage.png'))
      .toBe('splatnet/v3/stage.png');
    expect(call.options.relocations[0]('data/schedules.json'))
      .toBe('data/schedules.json');
  });

  it('does not transform public data upload bodies', async () => {
    let localPath = await fs.mkdtemp(path.join(os.tmpdir(), 'r2-syncer-'));
    temporaryDirectories.push(localPath);
    let jsonPath = path.join(localPath, 'schedules.json');
    await fs.writeFile(
      jsonPath,
      '{"image":"https://assets.splatoon3.ink/splatnet/one.png"}',
    );
    let syncClient = new FakeSyncClient;
    let syncer = new R2Syncer({ config, syncClient });
    await syncer.upload();
    let commandInput = syncClient.calls[0].options.commandInput;
    let input = {
      Body: { path: jsonPath },
      ContentLength: 61,
      Key: 'data/schedules.json',
    };

    let result = commandInput(input);

    expect(result.Body).toBeUndefined();
    expect(result.ContentLength).toBeUndefined();
    expect(result).toMatchObject({
      CacheControl: 'no-cache, stale-while-revalidate=5, stale-if-error=86400',
      ContentType: 'application/json',
    });
    expect(result).not.toHaveProperty('ACL');
  });

  it('does not rewrite image upload bodies', async () => {
    let syncClient = new FakeSyncClient;
    let syncer = new R2Syncer({ config, syncClient });
    await syncer.upload();
    let commandInput = syncClient.calls[0].options.commandInput;
    let body = { path: '/unused/image.png' };

    let result = commandInput({
      Body: body,
      ContentLength: 5,
      Key: 'splatnet/stage.png',
    });

    expect(result.Body).toBeUndefined();
    expect(result.ContentType).toBe('image/png');
  });

  it('uploads canonical data and relocated images through the real sync client', async () => {
    let localPath = await fs.mkdtemp(path.join(os.tmpdir(), 'r2-syncer-'));
    temporaryDirectories.push(localPath);
    await fs.mkdir(path.join(localPath, 'data'), { recursive: true });
    await fs.mkdir(path.join(localPath, 'assets/splatnet'), { recursive: true });
    await fs.writeFile(
      path.join(localPath, 'data/schedules.json'),
      '{"image":"https://assets.splatoon3.ink/splatnet/stage.png"}',
    );
    await fs.writeFile(
      path.join(localPath, 'data/festivals.US.ics'),
      'URL:https://splatoon3.ink\r\n'
      + 'ATTACH:https://assets.splatoon3.ink/splatnet/fest.png\r\n',
    );
    await fs.writeFile(path.join(localPath, 'assets/splatnet/stage.png'), 'image');
    await fs.writeFile(path.join(localPath, 'assets/main.js'), 'static site');
    let s3Client = new FakeS3Client;
    let syncClient = new S3SyncClient({ client: s3Client });
    let syncer = new R2Syncer({ config, localPath, s3Client, syncClient });

    await syncer.upload();

    expect(s3Client.uploads.map(upload => upload.Key).sort()).toEqual([
      'data/festivals.US.ics',
      'data/schedules.json',
      'splatnet/stage.png',
    ]);
    let json = s3Client.uploads.find(upload => upload.Key === 'data/schedules.json');
    expect(json.Body).toBe(
      '{"image":"https://assets.splatoon3.ink/splatnet/stage.png"}',
    );
    expect(json.ContentLength).toBe(Buffer.byteLength(json.Body));
    let calendar = s3Client.uploads.find(upload => upload.Key === 'data/festivals.US.ics');
    expect(calendar.Body).toBe(
      'URL:https://splatoon3.ink\r\n'
      + 'ATTACH:https://assets.splatoon3.ink/splatnet/fest.png\r\n',
    );
    expect(calendar.ContentLength).toBe(Buffer.byteLength(calendar.Body));
    expect(calendar.ContentType).toBe('text/calendar');
  });
});
