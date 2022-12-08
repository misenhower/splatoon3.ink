import DailyDropGearStatus from "./generators/DailyDropGearStatus.mjs";
import RegularGearStatus from "./generators/RegularGearStatus.mjs";
import SalmonRunGearStatus from "./generators/SalmonRunGearStatus.mjs";
import SalmonRunStatus from "./generators/SalmonRunStatus.mjs";
import SchedulesStatus from "./generators/SchedulesStatus.mjs";
import SplatfestResultsStatus from "./generators/SplatfestResultsStatus.mjs";
import StatusGeneratorManager from "./StatusGeneratorManager.mjs"

export function defaultTwitterManager() {
  return new StatusGeneratorManager([
    new SchedulesStatus,
    new DailyDropGearStatus,
    new RegularGearStatus,
    new SalmonRunStatus,
    new SalmonRunGearStatus,
    new SplatfestResultsStatus,
  ]);
}

export function sendStatuses() {
  return defaultTwitterManager().sendStatuses();
}

export function testStatuses() {
  return defaultTwitterManager().testStatuses();
}
