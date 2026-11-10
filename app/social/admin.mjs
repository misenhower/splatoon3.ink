// What the admin panel needs from social posting: the accounts and whether they post, when
// each status last went to each account, a preview of a status, and posting one by hand.

import ScreenshotHelper from '../screenshots/ScreenshotHelper.mjs';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import { readSocialSettings, setClientEnabled } from './SocialSettings.mjs';
import { defaultClients, defaultStatusGenerators, SOCIAL_LOCALES } from './index.mjs';

function accountClients(locale) {
  return defaultClients(locale).filter(client => !client.internal);
}

/**
 * @returns {Promise<{ key: string, name: string, locale: string, configured: boolean, enabled: boolean, disabledAt: number|null }[]>}
 *   Every account, whether it has credentials, and whether posting is turned on
 */
export async function socialAccounts() {
  let { disabledClients } = await readSocialSettings();
  let accounts = [];

  for (let locale of SOCIAL_LOCALES) {
    for (let client of accountClients(locale)) {
      accounts.push({
        key: client.key,
        name: client.name,
        locale: client.locale ?? locale,
        configured: !!(await client.canSend()),
        enabled: !disabledClients[client.key],
        disabledAt: disabledClients[client.key]?.at ?? null,
      });
    }
  }

  return accounts;
}

/**
 * @returns {{ key: string, name: string }[]} The statuses that can be posted, in posting order
 */
export function socialGenerators() {
  return defaultStatusGenerators().map(generator => ({ key: generator.key, name: generator.name }));
}

/**
 * When each status last went to each account, read from the delivery markers.
 * @returns {Promise<Record<string, Record<string, { postedAt: number }>>>} By account key, then status key
 */
export async function lastPosted() {
  let result = {};

  await Promise.all(SOCIAL_LOCALES.flatMap(locale => {
    let generators = defaultStatusGenerators({ locale });

    return accountClients(locale).flatMap(client => generators.map(async generator => {
      let postedAt = await generator.lastPostCache(client).getCachedAt();

      if (postedAt) {
        (result[client.key] ??= {})[generator.key] = { postedAt: postedAt.getTime() };
      }
    }));
  }));

  return result;
}

/**
 * @param {string} key An account's client key
 * @param {boolean} enabled
 * @returns {Promise<object[]>} The accounts afterwards
 */
export async function setAccountEnabled(key, enabled) {
  let known = SOCIAL_LOCALES.flatMap(accountClients).some(client => client.key === key);

  if (!known) {
    throw new Error(`Unknown account: ${key}`);
  }

  await setClientEnabled(key, enabled);

  return socialAccounts();
}

function findGenerator(key, locale) {
  let generator = defaultStatusGenerators({ locale }).find(candidate => candidate.key === key);

  if (!generator) {
    throw new Error(`Unknown status: ${key}`);
  }

  return generator;
}

/**
 * Render a status from the data published right now, without posting it or touching any
 * delivery marker.
 * @param {string} key A generator key such as "schedules"
 * @param {string} [locale]
 * @returns {Promise<{ text: string, contentWrapper: string|null, media: { type: string, altText: string|null, file: Uint8Array }[] }>}
 *   The text and images that would be posted
 */
export async function previewStatus(key, locale = 'en-US') {
  if (!SOCIAL_LOCALES.includes(locale)) {
    throw new Error(`Unknown locale: ${locale}`);
  }

  let generator = findGenerator(key, locale);
  let screenshots = new ScreenshotHelper;

  try {
    let status = await generator.getStatus(screenshots);

    if (!status.status) {
      throw new Error('There is nothing to post for this status right now');
    }

    return {
      text: status.status,
      contentWrapper: status.contentWrapper ?? null,
      media: (status.media ?? []).map(media => ({ type: media.type, altText: media.altText, file: media.file })),
    };
  } finally {
    await screenshots.close();
  }
}

/**
 * Post one status to chosen accounts now, whether or not it is due. Accounts that are turned
 * off or have no credentials are refused rather than skipped silently.
 * @param {string} key A generator key
 * @param {string[]} clientKeys Account keys; each gets the status in its own language
 * @returns {Promise<object[]>} One event per account (see StatusGeneratorManager.events)
 */
export async function postStatus(key, clientKeys) {
  let known = SOCIAL_LOCALES.flatMap(accountClients).map(client => client.key);
  let unknown = clientKeys.filter(clientKey => !known.includes(clientKey));

  if (!clientKeys.length || unknown.length) {
    throw new Error(unknown.length ? `Unknown account: ${unknown.join(', ')}` : 'Choose at least one account');
  }

  let events = [];

  for (let locale of SOCIAL_LOCALES) {
    let clients = accountClients(locale).filter(client => clientKeys.includes(client.key));

    if (!clients.length) {
      continue;
    }

    let generator = findGenerator(key, locale);
    let getStatus = generator.getStatus.bind(generator);

    // Scheduled runs only reach a generator when it has something to say; a forced post must
    // check for itself, or it would send an image with no text.
    generator.getStatus = async screenshots => {
      let status = await getStatus(screenshots);

      if (!status.status) {
        throw new Error('There is nothing to post for this status right now');
      }

      return status;
    };

    let manager = new StatusGeneratorManager([generator], clients);
    let available = await manager._getAvailableClients();

    for (let client of clients) {
      if (!available.includes(client)) {
        manager._record('error', generator, client, new Error('Account is turned off or has no credentials'));
      }
    }

    if (available.length) {
      let before = manager.events.length;

      await manager.sendStatuses(true);

      // Waiting for game translations is not an error to the scheduled runs, but here it
      // means nothing was posted.
      if (manager.events.length === before) {
        manager._record('error', generator, null, new Error('This status could not be generated yet'));
      }
    }

    events.push(...manager.events);
  }

  return events;
}
