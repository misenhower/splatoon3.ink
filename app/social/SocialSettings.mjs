import { storage } from '../common/storage/index.mjs';

// Operator choices about posting, kept in private storage so the scheduled runs, the Node
// runner, and the admin panel all see the same thing.
const KEY = 'settings/social.json';

/**
 * @returns {Promise<{ disabledClients: Record<string, { at: number }> }>} The saved settings
 */
export async function readSocialSettings() {
  let saved;

  try {
    saved = await storage().private.readJson(KEY);
  } catch (e) {
    // Unreadable settings must not silently re-enable an account that was turned off.
    throw new Error(`Could not read social settings: ${e?.message ?? e}`, { cause: e });
  }

  return { disabledClients: saved?.disabledClients ?? {} };
}

/**
 * Turn posting on or off for one account (a client key such as "threads" or "bluesky.jp").
 * While off, the account gets no posts at all: not from scheduled runs, not by hand.
 * @param {string} key
 * @param {boolean} enabled
 * @returns {Promise<{ disabledClients: Record<string, { at: number }> }>} The new settings
 */
export async function setClientEnabled(key, enabled) {
  let settings = await readSocialSettings();

  if (enabled) {
    delete settings.disabledClients[key];
  } else {
    settings.disabledClients[key] ??= { at: Date.now() };
  }

  await storage().private.writeText(KEY, JSON.stringify(settings, undefined, 2));

  return settings;
}
