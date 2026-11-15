import * as Sentry from '@sentry/core';
import { DurableObject } from 'cloudflare:workers';
import { LocalAuth } from '../../../app/splatnet/auth.mjs';
import NsoClient, { regionTokens } from '../../../app/splatnet/NsoClient.mjs';
import { captureLogs, RunLog } from './log.mjs';
import { REGIONS, setupRuntime } from './runtime.mjs';
import { HISTORY_MS } from './schedule.mjs';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Renewals are kept as "event:<start time>", so they sort by time.
const stamp = ms => String(Math.max(0, Math.floor(ms))).padStart(15, '0');
const summarize = ({ logs, ...event }) => event;

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
 *
 * Storage: "region"; "scheduled" (false once scheduled renewals are turned off); "lastRefreshAt";
 * "event:*" (the last 48 hours of renewals, each with what it printed, for the admin panel).
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

  // Renewal logs its failures instead of throwing (the cached tokens usually still work). It
  // succeeded if it ended with a new bullet token: a step that failed along the way (znca
  // briefly unavailable, say) is made up for by the next one, and is kept as a warning.
  async refresh({ region, trigger = 'manual' }) {
    await this.#remember(region);

    let startedAt = Date.now();
    let log = new RunLog;
    let failure = null;
    let renewed = false;

    try {
      let nsoClient = this.#nsoClient(region);

      renewed = await captureLogs(log, () => this.#auth.refresh(nsoClient));
    } catch (error) {
      failure = error;
      log.add('error', [error]);
    }

    let ok = renewed && !failure;
    let problems = log.lines.filter(line => line.level === 'error').map(line => line.text);
    // A renewal that failed without printing why still needs a reason.
    let errors = ok ? [] : problems.length ? problems : ['The renewal did not end with a new bullet token'];
    let expired = await this.ctx.storage.list({ prefix: 'event:', end: `event:${stamp(Date.now() - HISTORY_MS)}` });

    await this.ctx.storage.put(`event:${stamp(startedAt)}`, {
      at: startedAt,
      finishedAt: Date.now(),
      ok,
      trigger,
      errors,
      warnings: ok ? problems : [],
      logs: log.toJSON(),
    });
    await this.ctx.storage.put('lastRefreshAt', Date.now());

    if (expired.size) {
      await this.ctx.storage.delete([...expired.keys()].slice(0, 128));
    }

    if (errors.length) {
      Sentry.captureException(failure ?? new Error(`Nintendo credential renewal failed: ${errors[0]}`), { tags: { region, trigger } });
    }

    if (failure) {
      throw failure;
    }
  }

  /**
   * Renewals that started in a span of time, newest first, without their log lines.
   * @param {{ from?: number, to?: number, limit?: number }} [options] `to` is exclusive
   * @returns {Promise<object[]>} Renewals
   */
  async events({ from = 0, to = Date.now() + MINUTE_MS, limit = 1000 } = {}) {
    let events = await this.ctx.storage.list({
      start: `event:${stamp(from)}`,
      end: `event:${stamp(to)}`,
      reverse: true,
      limit,
    });

    return [...events.values()].map(summarize);
  }

  /**
   * One renewal with what it printed.
   * @param {{ at: number }} options When it started
   * @returns {Promise<object|null>} The renewal, or null if it is no longer kept
   */
  async event({ at }) {
    return (await this.ctx.storage.get(`event:${stamp(at)}`)) ?? null;
  }

  /**
   * The most recent renewals with their log lines, newest first.
   * @param {{ limit?: number }} [options]
   * @returns {Promise<object[]>} Renewals
   */
  async recentLogs({ limit = 12 } = {}) {
    return [...(await this.ctx.storage.list({ prefix: 'event:', reverse: true, limit })).values()];
  }

  // Scheduled renewals are on unless turned off from the admin panel. Off, tokens are still
  // obtained when an update needs one; they are just not renewed ahead of time.
  async #scheduled() {
    return (await this.ctx.storage.get('scheduled')) ?? true;
  }

  /**
   * Turn scheduled renewals on or off.
   * @param {{ region: string, enabled: boolean }} options
   */
  async setScheduling({ region, enabled }) {
    await this.#remember(region);
    await this.ctx.storage.put('scheduled', enabled);

    if (!enabled) {
      await this.ctx.storage.deleteAlarm();

      return { ok: true, region, enabled };
    }

    return { ok: true, region, enabled, ...(await this.ensureArmed({ region })) };
  }

  // Called by the cron watchdog: make sure the hourly refresh is scheduled.
  async ensureArmed({ region }) {
    await this.#remember(region);

    if (!regionTokens()[region]) {
      await this.ctx.storage.deleteAlarm();

      return { region, armed: false, reason: 'no session token' };
    }

    if (!(await this.#scheduled())) {
      await this.ctx.storage.deleteAlarm();

      return { region, armed: false, reason: 'scheduled renewals are off' };
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
      enabled: await this.#scheduled(),
      hasSessionToken: !!regionTokens()[region ?? ''],
      // The latest few; the panel loads the rest by time span.
      events: await this.events({ limit: 8 }),
    };
  }

  async alarm() {
    let region = await this.ctx.storage.get('region');

    // An alarm set before renewals were turned off.
    if (!region || !(await this.#scheduled())) {
      return;
    }

    try {
      await this.refresh({ region, trigger: 'scheduled' });
    } catch (error) {
      console.error(`[RegionAuth] [${region}] Refresh failed:`, error);
    }

    // LocalAuth.refresh logs individual failures; the cached tokens remain valid for over an
    // hour, so the next hourly attempt is soon enough.
    await this.ctx.storage.setAlarm(nextRefreshAt(region));
  }
}
