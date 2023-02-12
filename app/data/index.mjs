import GearUpdater from "./updaters/GearUpdater.mjs";
import StageScheduleUpdater from "./updaters/StageScheduleUpdater.mjs";
import CoopUpdater from "./updaters/CoopUpdater.mjs";
import FestivalUpdater from "./updaters/FestivalUpdater.mjs";
import { regionTokens } from "../splatnet/NsoClient.mjs";
import XRankUpdater from "./updaters/XRankUpdater.mjs";

function updaters() {
  const tokens = regionTokens();

  return [
    new StageScheduleUpdater,
    new GearUpdater,
    new CoopUpdater,
    tokens.US && new FestivalUpdater('US'),
    tokens.EU && new FestivalUpdater('EU'),
    tokens.JP && new FestivalUpdater('JP'),
    tokens.AP && new FestivalUpdater('AP'),
    new XRankUpdater('Tentatek', 'ATLANTIC'),
    new XRankUpdater('Takoroka', 'PACIFIC'),
  ].filter(u => u);
}

export async function updateAll() {
  console.info('Running all updaters...');

  for (let updater of updaters()) {
    try {
      await updater.updateIfNeeded();
    } catch (e) {
      console.error(e);
    }
  }

  console.info('Done running updaters');
}
