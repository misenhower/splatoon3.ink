import * as Sentry from '@sentry/node';
import S3Syncer from '../sync/S3Syncer.mjs';
import { canSyncS3, canUpload, upload } from '../sync/index.mjs';
import GearUpdater from './updaters/GearUpdater.mjs';
import StageScheduleUpdater from './updaters/StageScheduleUpdater.mjs';
import CoopUpdater from './updaters/CoopUpdater.mjs';
import FestivalUpdater from './updaters/FestivalUpdater.mjs';
import XRankUpdater from './updaters/XRankUpdater.mjs';
import StagesUpdater from './updaters/StagesUpdater.mjs';
import FestivalRankingsUpdater from './updaters/FestivalRankingsUpdater.mjs';
import ImageProcessor from './ImageProcessor.mjs';

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

async function runUpdater(updater, settings) {
  updater.settings = settings;

  try {
    await updater.updateIfNeeded();
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);
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

async function runLane(lane, config, run) {
  console.info(`Running ${config} ${lane} updaters...`);

  // Download private files to get updated tokens if needed
  if (canSyncS3()) {
    await (new S3Syncer).download(false);
  }

  await run(configs[config]);

  if (canUpload()) {
    await ImageProcessor.onIdle();
    await upload();
  }

  console.info(`Done running ${config} ${lane} updaters`);
}

export function updateFast(config = 'default') {
  return runLane('fast', config, settings =>
    Promise.all(fastUpdaters().map(updater => runUpdater(updater, settings))));
}

export function updateSlow(config = 'default') {
  return runLane('slow', config, async settings => {
    for (let updater of slowUpdaters()) {
      await runUpdater(updater, settings);
    }
  });
}

export async function update(config = 'default') {
  await updateFast(config);
  await updateSlow(config);
}
