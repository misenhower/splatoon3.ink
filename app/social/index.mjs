import FileWriter from "./clients/FileWriter.mjs";
import TwitterClient from "./clients/TwitterClient.mjs";
import DailyDropGearStatus from "./generators/DailyDropGearStatus.mjs";
import RegularGearStatus from "./generators/RegularGearStatus.mjs";
import SalmonRunGearStatus from "./generators/SalmonRunGearStatus.mjs";
import SalmonRunStatus from "./generators/SalmonRunStatus.mjs";
import SchedulesStatus from "./generators/SchedulesStatus.mjs";
import SplatfestResultsStatus from "./generators/SplatfestResultsStatus.mjs";
import StatusGeneratorManager from "./StatusGeneratorManager.mjs"

function defaultStatusGenerators() {
  return [
    new SchedulesStatus,
    new DailyDropGearStatus,
    new RegularGearStatus,
    new SalmonRunStatus,
    new SalmonRunGearStatus,
    new SplatfestResultsStatus,
  ];
}

function defaultClients() {
  return [
    new TwitterClient,
  ];
}

export function defaultStatusGeneratorManager() {
  return new StatusGeneratorManager(
    defaultStatusGenerators(),
    defaultClients(),
  );
}

export function testStatusGeneratorManager() {
  return new StatusGeneratorManager(
    defaultStatusGenerators(),
    [new FileWriter],
  );
}

export function sendStatuses() {
  return defaultStatusGeneratorManager().sendStatuses();
}

export function testStatuses() {
  return testStatusGeneratorManager().sendStatuses(true);
}
