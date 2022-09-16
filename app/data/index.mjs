import GearUpdater from "./updaters/GearUpdater.mjs";
import StageScheduleUpdater from "./updaters/StageScheduleUpdater.mjs";
import CoopUpdater from "./updaters/CoopUpdater.mjs";

function updaters() {
  return [
    new StageScheduleUpdater,
    new GearUpdater,
    new CoopUpdater,
  ];
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
