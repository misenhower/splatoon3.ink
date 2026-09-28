import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ValueCache from '../common/ValueCache.mjs';
import SplatNet3Client from './SplatNet3Client.mjs';

vi.mock('../common/prefixedConsole.mjs', () => ({
  default: () => ({ info: vi.fn(), debug: vi.fn() }),
}));

describe('SplatNet3Client bullet tokens', () => {
  let cache;
  let fetch;

  function makeClient(account = 'US', language = 'en-US') {
    const client = new SplatNet3Client({
      region: account,
      cachePrefix: `test.${account}`,
      getWebServiceToken: vi.fn().mockResolvedValue(`web-token-${account}`),
    }, language);

    client.queryHashes = { version: 'test-version' };

    return client;
  }

  function tokenRequests() {
    return fetch.mock.calls.filter(([url]) => url.endsWith('/api/bullet_tokens'));
  }

  beforeEach(() => {
    cache = new Map();

    vi.spyOn(ValueCache.prototype, 'getData').mockImplementation(async function () {
      return cache.get(this.path) ?? null;
    });

    vi.spyOn(ValueCache.prototype, 'setData').mockImplementation(async function (data) {
      cache.set(this.path, data);
    });

    fetch = vi.fn(async (url, options) => ({
      ok: true,
      json: async () => url.endsWith('/api/bullet_tokens')
        ? { bulletToken: `bullet-${options.headers['X-GameWebToken']}` }
        : { data: {} },
    }));

    vi.stubGlobal('fetch', fetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reuses one token across simultaneous updater clients and locales', async () => {
    const clients = Array.from({ length: 5 }, (_, index) => (
      makeClient('US', index === 0 ? 'en-US' : 'es-MX')
    ));

    await Promise.all(clients.map(client => client.getStageScheduleData()));

    expect(tokenRequests()).toHaveLength(1);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/api/graphql'))).toHaveLength(5);
    expect(clients.map(client => client.bulletToken)).toEqual(
      Array(5).fill({ bulletToken: 'bullet-web-token-US' }),
    );
  });

  it('reuses one token across concurrent queries on one client', async () => {
    const client = makeClient();

    await Promise.all([client.getStageScheduleData(), client.getGesotownData()]);

    expect(tokenRequests()).toHaveLength(1);
  });

  it('allows separate accounts to acquire tokens independently', async () => {
    const gate = Promise.withResolvers();
    fetch.mockImplementationOnce(() => gate.promise);

    const usToken = makeClient('US').getBulletToken();
    await vi.waitFor(() => expect(tokenRequests()).toHaveLength(1));

    try {
      const euToken = await makeClient('EU').getBulletToken();

      expect(euToken.bulletToken).toBe('bullet-web-token-EU');
      expect(tokenRequests()).toHaveLength(2);
    } finally {
      gate.resolve({ ok: true, json: async () => ({ bulletToken: 'us-token' }) });
      await usToken;
    }
  });

  it('reuses the cache and acquires again after the cache becomes unavailable', async () => {
    await makeClient().getBulletToken();
    await makeClient().getBulletToken();

    expect(tokenRequests()).toHaveLength(1);

    cache.clear();
    await makeClient().getBulletToken();

    expect(tokenRequests()).toHaveLength(2);
  });

  it('allows the next queued caller to retry after a failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const results = await Promise.allSettled([
      makeClient().getBulletToken(),
      makeClient().getBulletToken(),
    ]);

    expect(results.map(result => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(results[0].reason.message).toBe('Invalid bullet token response code: 503');
    expect(results[1].value).toEqual({ bulletToken: 'bullet-web-token-US' });
    expect(tokenRequests()).toHaveLength(2);

    await expect(makeClient().getBulletToken()).resolves.toEqual({
      bulletToken: 'bullet-web-token-US',
    });

    expect(tokenRequests()).toHaveLength(2);
  });

  it('serializes forced refreshes while bypassing a cached token', async () => {
    cache.set('storage/cache/test.US.bulletToken.json', { bulletToken: 'old-token' });

    let activeRequests = 0;
    let maxActiveRequests = 0;

    fetch.mockImplementation(async () => {
      activeRequests++;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

      await Promise.resolve();
      activeRequests--;

      return { ok: true, json: async () => ({ bulletToken: 'fresh-token' }) };
    });

    const tokens = await Promise.all([
      makeClient().getBulletToken(false),
      makeClient().getBulletToken(false),
    ]);

    expect(tokens).toEqual(Array(2).fill({ bulletToken: 'fresh-token' }));
    expect(tokenRequests()).toHaveLength(2);
    expect(maxActiveRequests).toBe(1);
  });

  it('does not let an in-progress cache lookup suppress a forced refresh', async () => {
    cache.set('storage/cache/test.US.bulletToken.json', { bulletToken: 'old-token' });

    const cached = makeClient().getBulletToken();
    const refreshed = makeClient().getBulletToken(false);

    expect(await cached).toEqual({ bulletToken: 'old-token' });
    expect(await refreshed).toEqual({ bulletToken: 'bullet-web-token-US' });
    expect(tokenRequests()).toHaveLength(1);
  });
});
