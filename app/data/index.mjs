import GearUpdater from "./updaters/GearUpdater.mjs";
import StageScheduleUpdater from "./updaters/StageScheduleUpdater.mjs";
import CoopUpdater from "./updaters/CoopUpdater.mjs";
import FestivalUpdater from "./updaters/FestivalUpdater.mjs";
import CurrentFestivalUpdater from "./updaters/CurrentFestivalUpdater.mjs";
import { regionTokens } from "../splatnet/NsoClient.mjs";

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
    tokens.US && new CurrentFestivalUpdater('US'),
    tokens.EU && new CurrentFestivalUpdater('EU'),
    tokens.JP && new CurrentFestivalUpdater('JP'),
    tokens.AP && new CurrentFestivalUpdater('AP'),
  ].filter(u => u);
}

export async function updateAll() {
  console.info('Running all updaters...');

  for (let updater of updaters()) {
    try {
      await updater.update();
    } catch (e) {
      console.error(e);
    }
  }

  console.info('Done running updaters');
}
