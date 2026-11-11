// What each lane does in one run, using the shared app/ code.

import { updateFast, updateSlow } from '../../../app/data/index.mjs';
import { flushArchive } from '../../../app/data/archive.mjs';
import RunLimits from '../../../app/data/RunLimits.mjs';
import { sendStatuses } from '../../../app/social/index.mjs';
import { updateAvatars } from '../../../app/social/updateAvatars.mjs';
import CloudflareCachePurger from '../../../app/sync/CloudflareCachePurger.mjs';
import { storage } from '../../../app/common/storage/index.mjs';

// Durable Object alarms are stopped after 15 minutes. The slow lane stops starting new work
// after this long and continues in a follow-up run instead.
export const SLOW_LANE_TIME_BUDGET_MS = 10 * 60 * 1000;

// The files the screenshot page loads from SITE_URL.
const RENDERED_DATA = [
  'data/schedules.json',
  'data/gear.json',
  'data/coop.json',
  'data/festivals.json',
  'data/locale/en-US.json',
  'data/locale/ja-JP.json',
];

function cachePurger() {
  let zoneId = process.env.CLOUDFLARE_CACHE_PURGE_ZONE_ID;
  let apiToken = process.env.CLOUDFLARE_CACHE_PURGE_API_TOKEN;

  if (!zoneId && !apiToken) {
    return null;
  }

  return new CloudflareCachePurger({
    zoneId,
    apiToken,
    hosts: (process.env.CLOUDFLARE_CACHE_PURGE_HOSTS ?? '').split(',').map(host => host.trim()).filter(Boolean),
  });
}

/** Purge edge-cached data JSON after writing new data (when purging is configured). */
export async function purgeDataCache() {
  let purger = cachePurger();

  if (!purger) {
    return false;
  }

  await purger.purgeData();

  return true;
}

/**
 * Screenshots render SITE_URL, not the bucket. Before rendering, make sure the site serves the
 * data this Worker just published; otherwise fail so the scheduler retries shortly.
 * @param {string} siteUrl
 */
export async function verifyPublishedData(siteUrl = process.env.SITE_URL) {
  if (!siteUrl) {
    throw new Error('SITE_URL must point to a site serving this Worker\'s published data');
  }

  for (let key of RENDERED_DATA) {
    let expected = await storage().public.readJson(key);

    if (!expected) {
      continue;
    }

    let response = await fetch(new URL(`/${key}`, siteUrl), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Rendering site returned HTTP ${response.status} for ${key}`);
    }

    if (JSON.stringify(await response.json()) !== JSON.stringify(expected)) {
      throw new Error(`Rendering site does not serve this Worker's ${key} yet`);
    }
  }
}

function summarize(updaters) {
  return {
    ok: updaters.every(updater => updater.ok),
    failed: updaters.filter(updater => !updater.ok),
    // Every updater's outcome, for the admin panel's run detail.
    results: updaters,
  };
}

/**
 * Time-sensitive data, then social posts.
 * @param {{ translations?: boolean, social?: boolean }} options Quick runs skip translations
 * @returns {Promise<object>} Run result
 */
export async function runFastLane({ translations = true, social = true } = {}) {
  // Archive snapshots are uploaded at the end, after social posts, so a slow archive bucket
  // can only delay the archive. They are uploaded even when posting fails.
  let limits = new RunLimits({ deferArchive: true });
  let result;
  let archive;

  try {
    let updaters = summarize(await updateFast({ translations, limits }));
    result = { ok: updaters.ok, updaters, purged: await purgeDataCache() };

    if (social) {
      await verifyPublishedData();
      // What was posted and what failed, for the admin panel's post log.
      result.posts = await sendStatuses();
      result.social = true;
    }
  } finally {
    archive = await flushArchive(limits);
  }

  return archive.archived || archive.failed ? { ...result, archive } : result;
}

/**
 * X-Rank, Splatfest rankings, and seasonal profile updates.
 * @param {{ timeBudgetMs?: number }} [options]
 * @returns {Promise<object>} Run result
 */
export async function runSlowLane({ timeBudgetMs = SLOW_LANE_TIME_BUDGET_MS } = {}) {
  let limits = new RunLimits({ deadline: Date.now() + timeBudgetMs });
  let updaters = summarize(await updateSlow({ limits }));
  let purged = await purgeDataCache();

  await updateAvatars();

  return { ok: updaters.ok, incomplete: limits.incomplete, updaters, purged };
}
