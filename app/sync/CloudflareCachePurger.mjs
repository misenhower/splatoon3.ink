import { setTimeout as sleep } from 'node:timers/promises';

export default class CloudflareCachePurger
{
  constructor({ zoneId, apiToken, hosts, fetch: fetcher = globalThis.fetch, wait = sleep }) {
    if (!/^[a-f0-9]{32}$/.test(zoneId ?? '') || !apiToken || !hosts?.length) {
      throw new Error('Cache purging requires a zone ID, API token, and public hosts.');
    }

    if (hosts.some(host => !/^[a-z0-9.-]+$/.test(host)) || hosts.length > 100) {
      throw new Error('Cache purge hosts must be hostnames without schemes or paths (at most 100).');
    }

    this.zoneId = zoneId;
    this.apiToken = apiToken;
    this.hosts = [...new Set(hosts)];
    this.fetch = fetcher;
    this.wait = wait;
  }

  async purgeData() {
    // Prefix purges cover query-string variants and also recover a previous failed
    // purge when the next sync has no changed objects. Images remain cached.
    const body = JSON.stringify({
      prefixes: this.hosts.map(host => `${host}/data/`),
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      let retryDelay = 1000 * 2 ** attempt;
      let failure;

      try {
        const response = await this.fetch(
          `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            body,
            signal: AbortSignal.timeout(10_000),
          },
        );
        const result = await response.json();

        if (response.ok && result.success === true) return;

        failure = new Error(`Cloudflare cache purge failed (HTTP ${response.status}).`);

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw Object.assign(failure, { permanent: true });
        }

        const retryAfter = Number(response.headers.get('Retry-After'));

        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          retryDelay = Math.min(retryAfter * 1000, 30_000);
        }
      } catch (error) {
        if (error.permanent) throw error;

        // Do not expose response bodies or request credentials in logs.
        failure = new Error('Cloudflare cache purge request failed.');
      }

      if (attempt === 2) throw failure;

      await this.wait(retryDelay);
    }
  }
}
