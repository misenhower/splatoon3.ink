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
  ].filter(u => u);
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
