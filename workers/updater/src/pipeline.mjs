// What each lane does in one run, using the shared app/ code.

import { updateFast, updateSlow } from '../../../app/data/index.mjs';
import { sendStatuses } from '../../../app/social/index.mjs';
import { updateAvatars } from '../../../app/social/updateAvatars.mjs';
import CloudflareCachePurger from '../../../app/sync/CloudflareCachePurger.mjs';
import { storage } from '../../../app/common/storage/index.mjs';

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
  };
}

/**
 * Time-sensitive data, then social posts.
 * @param {{ mode: string, social?: boolean }} options
 * @returns {Promise<object>} Run result
 */
export async function runFastLane({ mode, social = true }) {
  let updaters = summarize(await updateFast(mode));
  let result = { updaters, purged: await purgeDataCache() };

  if (social) {
    await verifyPublishedData();
    await sendStatuses();
    result.social = true;
  }

  return { ok: updaters.ok, ...result };
}

/**
 * X-Rank, Splatfest rankings, and seasonal profile updates.
 * @param {{ mode: string }} options
 * @returns {Promise<object>} Run result
 */
export async function runSlowLane({ mode }) {
  let updaters = summarize(await updateSlow(mode));
  let purged = await purgeDataCache();

  await updateAvatars();

  return { ok: updaters.ok, updaters, purged };
}
