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
 * @returns {Promise<{ name: string, ok: boolean, error?: string }>} The updater's outcome
 */
async function runUpdater(updater, settings, limits) {
  updater.settings = settings;
  updater.limits = limits;

  try {
    await updater.updateIfNeeded();

    return { name: updaterName(updater), ok: true };
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);

    return { name: updaterName(updater), ok: false, error: e?.message ?? String(e) };
  }
}

const configs = {
  quick: {
    disableLocalizations: true,
    disableXRank: true,
    disableFestivalRankings: true,
  },
  default: {
    disableXRank: true,
  },
  all: {
    // Everything enabled
  },
};

export const modes = Object.keys(configs);

async function runLane(lane, config, run) {
  if (!configs[config]) {
    throw new Error(`Unknown update mode: ${config}`);
  }

  console.info(`Running ${config} ${lane} updaters...`);

  let limits = new RunLimits;
  let results = await run(configs[config], limits);
  await limits.images.onIdle();

  console.info(`Done running ${config} ${lane} updaters`);

  return results;
}

/**
 * @param {string} [config] Update mode (quick, default, or all)
 * @returns {Promise<{ name: string, ok: boolean, error?: string }[]>} One result per updater
 */
export function updateFast(config = 'default') {
  return runLane('fast', config, (settings, limits) =>
    Promise.all(fastUpdaters().map(updater => runUpdater(updater, settings, limits))));
}

/**
 * @param {string} [config] Update mode (quick, default, or all)
 * @returns {Promise<{ name: string, ok: boolean, error?: string }[]>} One result per updater
 */
export function updateSlow(config = 'default') {
  return runLane('slow', config, async (settings, limits) => {
    let results = [];

    for (let updater of slowUpdaters()) {
      results.push(await runUpdater(updater, settings, limits));
    }

    return results;
  });
}

export async function update(config = 'default') {
  return [...await updateFast(config), ...await updateSlow(config)];
}
