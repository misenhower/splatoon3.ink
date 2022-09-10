import StageScheduleUpdater from "./updaters/StageScheduleUpdater.mjs";

function updaters() {
  return [
    new StageScheduleUpdater,
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
