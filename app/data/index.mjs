// @sentry/core reports to whichever SDK the runtime initialized (Node or Cloudflare).
import * as Sentry from '@sentry/core';
import GearUpdater from './updaters/GearUpdater.mjs';
import StageScheduleUpdater from './updaters/StageScheduleUpdater.mjs';
import CoopUpdater from './updaters/CoopUpdater.mjs';
import FestivalUpdater from './updaters/FestivalUpdater.mjs';
import XRankUpdater from './updaters/XRankUpdater.mjs';
import StagesUpdater from './updaters/StagesUpdater.mjs';
import FestivalRankingsUpdater from './updaters/FestivalRankingsUpdater.mjs';
import RunLimits from './RunLimits.mjs';

// Time-sensitive data (schedules, gear, Splatfest results, etc.); these run concurrently.
function fastUpdaters() {
  return [
    new StageScheduleUpdater,
    new GearUpdater,
    new CoopUpdater,
    new FestivalUpdater('US'),
    new FestivalUpdater('EU'),
    new FestivalUpdater('JP'),
    new FestivalUpdater('AP'),
    new StagesUpdater,
  ];
}

// Large, less urgent data; these run one at a time after the fast updaters to limit memory use.
// Rankings read the published festivals data, so they must follow FestivalUpdater.
function slowUpdaters() {
  return [
    new XRankUpdater('Tentatek', 'ATLANTIC'),
    new XRankUpdater('Takoroka', 'PACIFIC'),
    new FestivalRankingsUpdater('US'),
    new FestivalRankingsUpdater('EU'),
    new FestivalRankingsUpdater('JP'),
    new FestivalRankingsUpdater('AP'),
  ];
}

function updaterName(updater) {
  return [updater.name ?? updater.constructor.name, updater.divisionName ?? updater.region]
    .filter(Boolean).join(' ');
}

/**
 * @param {object} updater
 * @param {object} settings
 * @param {RunLimits} limits
 * @returns {Promise<{ name: string, ok: boolean, ms: number, error?: string }>} The updater's outcome and how long it took
 */
async function runUpdater(updater, settings, limits) {
  updater.settings = settings;
  updater.limits = limits;

  let startedAt = Date.now();

  try {
    await updater.updateIfNeeded();

    return { name: updaterName(updater), ok: true, ms: Date.now() - startedAt };
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);

    return { name: updaterName(updater), ok: false, ms: Date.now() - startedAt, error: e?.message ?? String(e) };
  }
}

async function runLane(lane, settings, run, limits = new RunLimits) {
  console.info(`Running ${lane} updaters...`);

  let results = await run(settings, limits);
  await limits.images.onIdle();

  console.info(`Done running ${lane} updaters`);

  return results;
}

/**
 * Schedules, gear, co-op, festivals and stages.
 * @param {object} [options]
 * @param {boolean} [options.translations] Also update the localization files. Quick runs skip
 *   them, since only the first update after the hour turns over needs to be fast.
 * @param {RunLimits} [options.limits]
 * @returns {Promise<{ name: string, ok: boolean, error?: string }[]>} One result per updater
 */
export function updateFast({ translations = true, limits } = {}) {
  return runLane('fast', { disableLocalizations: !translations }, (settings, limits) =>
    Promise.all(fastUpdaters().map(updater => runUpdater(updater, settings, limits))), limits);
}

/**
 * X-Rank and Splatfest rankings, one updater at a time.
 * @param {object} [options]
 * @param {RunLimits} [options.limits] With a deadline, updaters stop starting new work once it
 *   passes and `limits.incomplete` is set; the remaining work happens in a later run
 * @returns {Promise<{ name: string, ok: boolean, skipped?: boolean, error?: string }[]>} One result per updater
 */
export function updateSlow({ limits } = {}) {
  return runLane('slow', {}, async (settings, limits) => {
    let results = [];

    for (let updater of slowUpdaters()) {
      if (limits.outOfTime()) {
        results.push({ name: updaterName(updater), ok: true, skipped: true });
        continue;
      }

      results.push(await runUpdater(updater, settings, limits));
    }

    return results;
  }, limits);
}

// What `npm run splatnet[:quick|:all]` updates.
const scopes = {
  quick: () => updateFast({ translations: false }),
  default: () => updateFast(),
  all: async () => [...await updateFast(), ...await updateSlow()],
};

/**
 * Update from the command line.
 * @param {string} [scope] quick (the fast lane without translations), default (the fast lane),
 *   or all (both lanes)
 * @returns {Promise<object[]>} One result per updater
 */
export function update(scope = 'default') {
  if (!scopes[scope]) {
    throw new Error(`Unknown update scope: ${scope} (use ${Object.keys(scopes).join(', ')})`);
  }

  return scopes[scope]();
}
