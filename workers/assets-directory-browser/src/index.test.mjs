import { describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:workers';
import worker from './index.js';

class FakeBucket
{
  calls = [];

  constructor(result = {}) {
    this.result = {
      cursor: 'next page',
      delimitedPrefixes: ['data/locale/'],
      objects: [{
        key: 'data/schedules.json',
        size: 54861,
        uploaded: new Date('2026-08-30T17:30:26Z'),
      }],
      truncated: true,
      ...result,
    };
  }

  async list(options) {
    this.calls.push(options);
    return this.result;
  }
}

describe('assets directory browser', () => {
  it('uses natural directory paths only when local development is enabled', async () => {
    await env.ASSETS.put('local/example.json', '{}');
    let localEnv = {
      ASSETS: env.ASSETS,
      LOCAL_DEVELOPMENT: 'true',
    };

    let localResponse = await worker.fetch(
      new Request('http://localhost:8787/local/'),
      localEnv,
    );
    let productionResponse = await worker.fetch(
      new Request('https://assets.splatoon3.ink/local/'),
      env,
    );

    expect(localResponse.status).toBe(200);
    expect(await localResponse.text()).toContain('href="/local/example.json"');
    expect(productionResponse.status).toBe(404);
  });

  it('serves linked objects from local R2 only in local development', async () => {
    await env.ASSETS.put('local/example.json', '{"local":true}', {
      httpMetadata: { contentType: 'application/json' },
    });
    let localEnv = {
      ASSETS: env.ASSETS,
      LOCAL_DEVELOPMENT: 'true',
    };

    let response = await worker.fetch(
      new Request('http://localhost:8787/local/example.json'),
      localEnv,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.text()).toBe('{"local":true}');
  });

  it('lists objects from the configured R2 binding using canonical public links', async () => {
    await env.ASSETS.put('data/schedules.json', 'schedule data');
    await env.ASSETS.put('data/locale/en-US.json', 'locale data');

    let request = new Request(
      'https://assets.splatoon3.ink/__directory/data/',
    );

    let response = await worker.fetch(request, env);
    let html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(html).not.toContain('<h1>Asset browser</h1>');
    expect(html).not.toContain('Public Splatoon 3 data and media');
    expect(html).toContain('<span aria-current="page">data</span>');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/data/locale/"');
    expect(html).toContain('href="/data/schedules.json"');
    expect(html).not.toContain('__directory');
  });

  it('shows the data archive as a directory in the R2 data listing', async () => {
    let bucket = new FakeBucket({
      cursor: undefined,
      delimitedPrefixes: ['data/locale/'],
      objects: [],
      truncated: false,
    });

    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/data/',
    ), { ASSETS: bucket });
    let html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('href="/data/archive/"');
    expect(html).toContain('<span class="entry-name">archive&#x2F;</span>');
  });

  it('browses archive directories while linking files to the public archive origin', async () => {
    let fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`
      <?xml version="1.0" encoding="UTF-8"?>
      <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <Prefix>2026/08/</Prefix>
        <IsTruncated>true</IsTruncated>
        <Contents>
          <Key>2026/08/2026-08-01.tar.zst</Key>
          <LastModified>2026-08-31T01:02:03.000Z</LastModified>
          <ETag>&quot;archive-etag&quot;</ETag>
          <Size>1536</Size>
        </Contents>
        <CommonPrefixes><Prefix>2026/08/31/</Prefix></CommonPrefixes>
        <NextContinuationToken>next archive page</NextContinuationToken>
      </ListBucketResult>
    `, { headers: { 'Content-Type': 'application/xml' } }));

    let response = await worker.fetch(new Request(
      'http://localhost:8787/data/archive/2026/08/?cursor=current%20archive%20page',
    ), {
      ARCHIVE_ORIGIN: 'https://data-archive.splatoon3.ink',
      ASSETS: new FakeBucket,
      LOCAL_DEVELOPMENT: 'true',
    });
    let html = await response.text();

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0].url).toBe(
      'https://data-archive.splatoon3.ink/?list-type=2&delimiter=%2F&max-keys=1000&prefix=2026%2F08%2F&continuation-token=current+archive+page',
    );
    expect(html).toContain('href="/data/archive/2026/08/31/"');
    expect(html).toContain('href="https://data-archive.splatoon3.ink/2026/08/2026-08-01.tar.zst"');
    expect(html).toContain('href="/data/archive/2026/08/?cursor=next%20archive%20page"');
    expect(html).toContain('1.5 KB');
    expect(html).toContain('2026-08-31 01:02:03 UTC');

    fetchSpy.mockRestore();
  });

  it('returns a public JSON representation of a directory page', async () => {
    let bucket = new FakeBucket({
      cursor: 'next page',
      delimitedPrefixes: ['splatnet/images/badges/'],
      objects: [{
        etag: 'opaque-etag',
        key: 'splatnet/images/example.png',
        size: 48123,
        uploaded: new Date('2026-08-30T01:02:03Z'),
      }],
      truncated: true,
    });
    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/splatnet/images/?format=json&cursor=current%20page',
    ), { ASSETS: bucket });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      directory: {
        prefix: 'splatnet/images/',
        url: 'https://assets.splatoon3.ink/splatnet/images/',
      },
      directories: [{
        name: 'badges/',
        prefix: 'splatnet/images/badges/',
        url: 'https://assets.splatoon3.ink/splatnet/images/badges/',
      }],
      files: [{
        name: 'example.png',
        key: 'splatnet/images/example.png',
        url: 'https://assets.splatoon3.ink/splatnet/images/example.png',
        size: 48123,
        uploaded: '2026-08-30T01:02:03.000Z',
        etag: 'opaque-etag',
      }],
      next: 'https://assets.splatoon3.ink/splatnet/images/?format=json&cursor=next%20page',
    });
    expect(bucket.calls).toEqual([{
      cursor: 'current page',
      delimiter: '/',
      limit: 1000,
      prefix: 'splatnet/images/',
    }]);
  });

  it('renders responsive light and dark themes under a nonce-based CSP', async () => {
    let response = await worker.fetch(
      new Request('https://assets.splatoon3.ink/__directory/'),
      env,
    );
    let html = await response.text();
    let policy = response.headers.get('content-security-policy');
    let nonce = policy?.match(/style-src 'nonce-([^']+)'/)?.[1];

    expect(nonce).toBeTruthy();
    expect(html).toContain(`<style nonce="${nonce}">`);
    expect(html).toContain('@media (prefers-color-scheme: dark)');
    expect(html).toContain('@media (max-width: 640px)');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
  });

  it('passes an opaque pagination cursor to R2', async () => {
    let bucket = new FakeBucket;
    let request = new Request(
      'https://assets.splatoon3.ink/__directory/data/?cursor=current%20page',
    );

    let response = await worker.fetch(request, { ASSETS: bucket });
    let html = await response.text();

    expect(bucket.calls).toEqual([{
      cursor: 'current page',
      delimiter: '/',
      limit: 1000,
      prefix: 'data/',
    }]);
    expect(response.status).toBe(200);
    expect(html).toContain('href="/data/?cursor=next%20page"');
    expect(html).toContain('<link rel="alternate" type="application/json" href="/data/?format=json&amp;cursor=current%20page">');
    expect(html).toContain('href="/data/?format=json&amp;cursor=current%20page">JSON</a>');
  });

  it('renders a safe root listing with object metadata', async () => {
    let bucket = new FakeBucket({
      cursor: undefined,
      delimitedPrefixes: ['data/'],
      objects: [{
        key: 'odd<&".json',
        size: 1536,
        uploaded: new Date('2026-08-30T17:30:26Z'),
      }],
      truncated: false,
    });

    let response = await worker.fetch(
      new Request('https://assets.splatoon3.ink/__directory/'),
      { ASSETS: bucket },
    );
    let html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<link rel="canonical" href="https://assets.splatoon3.ink/">');
    expect(html).not.toContain('>../</a>');
    expect(html).toContain('href="/data/"');
    expect(html).toContain('href="/odd%3C%26%22.json"');
    expect(html).toContain('odd&lt;&amp;&quot;.json');
    expect(html).toContain('1.5 KB');
    expect(html).toContain('2026-08-30 17:30:26 UTC');
  });

  it('rejects unsupported methods without listing the bucket', async () => {
    let bucket = new FakeBucket;
    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/data/',
      { method: 'POST' },
    ), { ASSETS: bucket });

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(bucket.calls).toHaveLength(0);
  });

  it('returns a non-cacheable 404 for an unknown prefix', async () => {
    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/missing/',
    ), env);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('Directory not found');
  });

  it('returns machine-readable errors for JSON listing requests', async () => {
    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/missing/?format=json',
    ), env);

    expect(response.status).toBe(404);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      error: {
        code: 'directory_not_found',
        message: 'Directory not found',
      },
    });
  });

  it('rejects unsupported listing formats without reading R2', async () => {
    let bucket = new FakeBucket;
    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/data/?format=xml',
    ), { ASSETS: bucket });

    expect(response.status).toBe(400);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      error: {
        code: 'unsupported_format',
        message: 'Unsupported format',
      },
    });
    expect(bucket.calls).toHaveLength(0);
  });

  it('returns a controlled error when R2 listing fails', async () => {
    let errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    let bucket = {
      list: vi.fn().mockRejectedValue(new Error('R2 unavailable')),
    };

    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/data/',
    ), { ASSETS: bucket });

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('Directory listing unavailable');
    expect(errorLog).toHaveBeenCalledWith(JSON.stringify({
      error: 'R2 unavailable',
      message: 'R2 directory listing failed',
      prefix: 'data/',
    }));
    errorLog.mockRestore();
  });

  it('returns a controlled error when the archive listing fails', async () => {
    let errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unavailable', { status: 503 }),
    );

    let response = await worker.fetch(new Request(
      'https://assets.splatoon3.ink/__directory/data/archive/2026/',
    ), {
      ARCHIVE_ORIGIN: 'https://data-archive.splatoon3.ink',
      ASSETS: new FakeBucket,
    });

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('Directory listing unavailable');
    expect(errorLog).toHaveBeenCalledWith(JSON.stringify({
      error: 'Archive listing returned 503',
      message: 'Archive directory listing failed',
      prefix: 'data/archive/2026/',
    }));

    fetchSpy.mockRestore();
    errorLog.mockRestore();
  });
});
