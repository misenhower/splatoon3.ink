import NsoClient, { regionTokens } from './NsoClient.mjs';
import { auth } from './auth.mjs';

/**
 * Cache Warming
 *
 * This helps ensure we have reliable access to the SplatNet 3 API,
 * even if e.g. the imink API has intermittent downtime.
 */
export async function warmCaches() {
  console.info('Warming caches...');

  for (let [region, token] of Object.entries(regionTokens())) {
    if (!token) {
      console.warn('Session token not set for region %s', region);
      continue;
    }

    await warmCache(region);
  }
}

export function warmCache(region) {
  return auth().refresh(NsoClient.make(region));
}
