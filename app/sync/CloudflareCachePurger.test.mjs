import { describe, expect, it, vi } from 'vitest';
import CloudflareCachePurger from './CloudflareCachePurger.mjs';

function setup(responses) {
  const fetch = vi.fn();

  for (const response of responses) fetch.mockResolvedValueOnce(response);

  const wait = vi.fn();
  const purger = new CloudflareCachePurger({
    zoneId: 'a'.repeat(32),
    apiToken: 'test-token',
    hosts: ['splatoon3.ink', 'assets.splatoon3.ink'],
    fetch,
    wait,
  });

  return { fetch, wait, purger };
}

describe('Cloudflare cache purging', () => {
  it('purges only the data prefixes on each public host', async () => {
    const { fetch, purger } = setup([Response.json({ success: true })]);

    await purger.purgeData();

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`https://api.cloudflare.com/client/v4/zones/${'a'.repeat(32)}/purge_cache`);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toEqual({
      prefixes: ['splatoon3.ink/data/', 'assets.splatoon3.ink/data/'],
    });
  });

  it('retries rate limits and honors Retry-After', async () => {
    const { fetch, wait, purger } = setup([
      Response.json({ success: false }, { status: 429, headers: { 'Retry-After': '12' } }),
      Response.json({ success: true }),
    ]);

    await purger.purgeData();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(12_000);
  });

  it('reports permanent authentication failure without retrying or leaking response details', async () => {
    const { fetch, purger } = setup([
      Response.json({ success: false, errors: ['sensitive detail'] }, { status: 403 }),
    ]);

    await expect(purger.purgeData()).rejects.toThrow('Cloudflare cache purge failed (HTTP 403).');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('rejects an unsuccessful API result even with HTTP 200', async () => {
    const { fetch, purger } = setup(Array.from({ length: 3 }, () => Response.json({ success: false })));

    await expect(purger.purgeData()).rejects.toThrow('Cloudflare cache purge failed');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('retries network failures with a bounded attempt count', async () => {
    const { fetch, purger } = setup([]);
    fetch.mockRejectedValue(new Error('network failure with sensitive details'));

    await expect(purger.purgeData()).rejects.toThrow('Cloudflare cache purge request failed.');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
