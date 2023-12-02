import GearUpdater from "./updaters/GearUpdater.mjs";
import StageScheduleUpdater from "./updaters/StageScheduleUpdater.mjs";
import CoopUpdater from "./updaters/CoopUpdater.mjs";
import FestivalUpdater from "./updaters/FestivalUpdater.mjs";
import XRankUpdater from "./updaters/XRankUpdater.mjs";
import StagesUpdater from "./updaters/StagesUpdater.mjs";

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
  ];
}

function lowPriorityUpdaters() {
  return [
    new XRankUpdater('Tentatek', 'ATLANTIC'),
    new XRankUpdater('Takoroka', 'PACIFIC'),
  ];
}

async function run(updaters) {
  for (let updater of updaters) {
    try {
      await updater.updateIfNeeded();
    } catch (e) {
      console.error(e);
    }
  }
}

export async function updateAll() {
  console.info('Running all updaters...');
  await run([
    ...updaters(),
    ...lowPriorityUpdaters(),
  ]);
  console.info('Done running all updaters');
}

export async function updatePrimary() {
  console.info('Running primary updaters...');
  await run(updaters());
  console.info('Done running primary updaters');
}

export async function updateLowPriority() {
  console.info('Running low-priority updaters...');
  await run(lowPriorityUpdaters());
  console.info('Done running low-priority updaters');
}
