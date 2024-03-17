import * as Sentry from '@sentry/node';
import GearUpdater from './updaters/GearUpdater.mjs';
import StageScheduleUpdater from './updaters/StageScheduleUpdater.mjs';
import CoopUpdater from './updaters/CoopUpdater.mjs';
import FestivalUpdater from './updaters/FestivalUpdater.mjs';
import XRankUpdater from './updaters/XRankUpdater.mjs';
import StagesUpdater from './updaters/StagesUpdater.mjs';

function updaters() {
  return [
    new StageScheduleUpdater,
    new GearUpdater,
    new CoopUpdater,
    new FestivalUpdater('US'),
    new FestivalUpdater('EU'),
    new FestivalUpdater('JP'),
    new FestivalUpdater('AP'),
    new StagesUpdater,
    new XRankUpdater('Tentatek', 'ATLANTIC'),
    new XRankUpdater('Takoroka', 'PACIFIC'),
  ];
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

export async function update(config = 'default') {
  console.info(`Running ${config} updaters...`);

  let settings = configs[config];

  for (let updater of updaters()) {
    updater.settings = settings;
    try {
      await updater.updateIfNeeded();
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);
    }
  }

  console.info(`Done running ${config} updaters`);
}
