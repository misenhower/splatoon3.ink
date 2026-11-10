import { DurableObject } from 'cloudflare:workers';
import { LocalAuth } from '../../../app/splatnet/auth.mjs';
import NsoClient, { regionTokens } from '../../../app/splatnet/NsoClient.mjs';
import { captureLogs, RunLog } from './log.mjs';
import { REGIONS, setupRuntime } from './runtime.mjs';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MAX_EVENTS = 24;

/**
 * When to renew a region's credentials: once an hour at :35–:38 (one minute apart per region),
 * well away from the top-of-the-hour updates. Tokens last about two hours, so the cached token
 * is always valid when the fast lane needs it.
 * @param {string} region
 * @param {number} [now]
 * @returns {number} Epoch milliseconds
 */
export function nextRefreshAt(region, now = Date.now()) {
  let offset = (35 + REGIONS.indexOf(region)) * MINUTE_MS;
  let candidate = now - (now % HOUR_MS) + offset;

  return candidate > now ? candidate : candidate + HOUR_MS;
}

/**
 * One instance per region (named by region). Every token request for the region comes here,
 * so parallel lanes share one token and never log in to the same account at the same time.
 * It runs the same LocalAuth code as the Node runner; caches stay in private R2 storage.
 */
export class RegionAuth extends DurableObject {
  #auth = new LocalAuth;

  constructor(ctx, env) {
    super(ctx, env);
    setupRuntime(env);
  }

  #nsoClient(region) {
    if (!REGIONS.includes(region)) {
      throw new Error(`Invalid region: ${region}`);
    }

    if (!regionTokens()[region]) {
      throw new Error(`Session token not set for region ${region}`);
    }

    return NsoClient.make(region);
  }

  async #remember(region) {
    if ((await this.ctx.storage.get('region')) !== region) {
      await this.ctx.storage.put('region', region);
    }
  }

  async bulletToken({ region, language, useCache = true }) {
    await this.#remember(region);

    return this.#auth.bulletToken(this.#nsoClient(region), { language, useCache });
  }

  // Renewal logs its failures instead of throwing (the cached tokens usually still work), so
  // the outcome recorded for the admin panel comes from what it printed.
  async refresh({ region }) {
    await this.#remember(region);

    let startedAt = Date.now();
    let log = new RunLog;
    let failure = null;

    try {
      let nsoClient = this.#nsoClient(region);

      await captureLogs(log, () => this.#auth.refresh(nsoClient));
    } catch (error) {
      failure = error;
      log.add('error', [error]);
    }

    let errors = log.lines.filter(line => line.level === 'error').map(line => line.text);
    let events = (await this.ctx.storage.get('events')) ?? [];

    events.unshift({ at: startedAt, finishedAt: Date.now(), ok: errors.length === 0, errors });
    await this.ctx.storage.put('events', events.slice(0, MAX_EVENTS));
    await this.ctx.storage.put('lastRefreshAt', Date.now());

    if (failure) {
      throw failure;
    }
  }

  // Called by the cron watchdog: make sure the hourly refresh is scheduled.
  async ensureArmed({ region }) {
    await this.#remember(region);

    if (!regionTokens()[region]) {
      await this.ctx.storage.deleteAlarm();

      return { region, armed: false, reason: 'no session token' };
    }

    let alarmAt = await this.ctx.storage.getAlarm();

    if (alarmAt === null) {
      alarmAt = nextRefreshAt(region);
      await this.ctx.storage.setAlarm(alarmAt);
    }

    return { region, armed: true, alarmAt };
  }

  async status() {
    let region = (await this.ctx.storage.get('region')) ?? null;

    return {
      region,
      alarmAt: await this.ctx.storage.getAlarm(),
      lastRefreshAt: (await this.ctx.storage.get('lastRefreshAt')) ?? null,
      hasSessionToken: !!regionTokens()[region ?? ''],
      events: (await this.ctx.storage.get('events')) ?? [],
    };
  }

  async alarm() {
    let region = await this.ctx.storage.get('region');

    if (!region) {
      return;
    }

    try {
      await this.refresh({ region });
    } catch (error) {
      console.error(`[RegionAuth] [${region}] Refresh failed:`, error);
    }

    // LocalAuth.refresh logs individual failures; the cached tokens remain valid for over an
    // hour, so the next hourly attempt is soon enough.
    await this.ctx.storage.setAlarm(nextRefreshAt(region));
  }
}
