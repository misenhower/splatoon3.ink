import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import S3ArchiveStorage from './S3ArchiveStorage.mjs';

const settings = {
  endpoint: 'https://nyc3.spaces.test/',
  region: 'nyc3',
  bucket: 'archive-test',
  accessKeyId: 'key-id',
  secretAccessKey: 'secret',
  retryDelayMs: 0,
};

const name = '2026-11-08.12-00-00.gear.json';

describe('S3ArchiveStorage', () => {
  let requests;
  let answers;

  beforeEach(() => {
    requests = [];
    answers = [];

    vi.stubGlobal('fetch', async (input, init) => {
      let request = new Request(input, init);
      let answer = answers.shift() ?? new Response(null, { status: 200 });

      requests.push({ url: request.url, method: request.method, headers: request.headers, body: await request.text() });

      if (answer instanceof Error) {
        throw answer;
      }

      return answer;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('files snapshots by day, like the Node uploader', () => {
    expect(S3ArchiveStorage.objectKey(name)).toBe(`2026/11/08/${name}`);
    expect(S3ArchiveStorage.objectKey('2026-01-02.03-04-05.xrank.detail.a-1.splatzones.json'))
      .toBe('2026/01/02/2026-01-02.03-04-05.xrank.detail.a-1.splatzones.json');
    expect(() => S3ArchiveStorage.objectKey('gear.json')).toThrow('start with a date');
  });

  it('puts a signed, publicly readable JSON object in the bucket', async () => {
    await new S3ArchiveStorage(settings).writeText(name, '{"a":1}');

    expect(requests).toHaveLength(1);

    let [request] = requests;

    expect(request.method).toBe('PUT');
    expect(request.url).toBe(`https://nyc3.spaces.test/archive-test/2026/11/08/${name}`);
    expect(request.body).toBe('{"a":1}');
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.headers.get('x-amz-acl')).toBe('public-read');
    expect(request.headers.get('Authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=key-id\/\d{8}\/nyc3\/s3\/aws4_request/);
    expect(request.headers.get('Authorization')).toContain('x-amz-acl');
  });

  it('tries again after a server error or a request that gets no answer', async () => {
    answers.push(new Response('busy', { status: 503 }), new TypeError('network down'));

    await new S3ArchiveStorage(settings).writeText(name, '{}');

    expect(requests).toHaveLength(3);
  });

  it('gives up after three attempts, with the last failure', async () => {
    answers.push(new Response('a', { status: 500 }), new Response('b', { status: 502 }), new Response('<Error>\n  SlowDown</Error>', { status: 503 }));

    await expect(new S3ArchiveStorage(settings).writeText(name, '{}'))
      .rejects.toThrow('Archive upload failed with HTTP 503: <Error> SlowDown</Error>');
    expect(requests).toHaveLength(3);
  });

  it('does not retry a request the bucket refuses', async () => {
    answers.push(new Response('<Code>SignatureDoesNotMatch</Code>', { status: 403 }));

    await expect(new S3ArchiveStorage(settings).writeText(name, '{}')).rejects.toThrow('HTTP 403: <Code>SignatureDoesNotMatch</Code>');
    expect(requests).toHaveLength(1);
  });

  it('is write-only', () => {
    expect(() => new S3ArchiveStorage(settings).readJson(name)).toThrow('write-only');
  });
});
