// Data snapshots for the archive (storage().archive). The archive is a record on the side: a
// snapshot that cannot be written is a warning, never a failed update.

import * as Sentry from '@sentry/core';
import pLimit from 'p-limit';
import prefixedConsole from '../common/prefixedConsole.mjs';
import { storage } from '../common/storage/index.mjs';

/**
 * Write one snapshot now.
 * @param {{ key: string, text: string, name: string }} snapshot Archive key, content, and data file name
 * @param {{ warn: (...args: unknown[]) => void }} [console]
 * @returns {Promise<boolean>} Whether it was written
 */
export async function archiveSnapshot({ key, text, name }, console = prefixedConsole('Archive')) {
  try {
    await storage().archive.writeText(key, text);

    return true;
  } catch (e) {
    console.warn(`Could not archive ${name}:`, e);
    Sentry.captureException(e);

    return false;
  }
}

/**
 * Write the snapshots a run held back (see RunLimits' deferArchive), and forget them.
 * @param {import('./RunLimits.mjs').default} limits
 * @returns {Promise<{ archived: number, failed: number }>} How many were written and not
 */
export async function flushArchive(limits) {
  // Several updaters can save the same file in one run (each region's FestivalUpdater writes
  // the combined festivals.json); only the newest copy of each snapshot is written.
  let snapshots = [...new Map(limits.heldSnapshots.splice(0).map(snapshot => [snapshot.key, snapshot])).values()];
  let limit = pLimit(4);
  let results = await Promise.all(snapshots.map(snapshot => limit(() => archiveSnapshot(snapshot))));
  let archived = results.filter(Boolean).length;

  return { archived, failed: results.length - archived };
}
