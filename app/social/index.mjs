import FileWriter from "./clients/FileWriter.mjs";
import MastodonClient from "./clients/MastodonClient.mjs";
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
    new MastodonClient,
  ];
}

export function defaultStatusGeneratorManager() {
  return new StatusGeneratorManager(
    defaultStatusGenerators(),
    defaultClients(),
  );
}

export function testStatusGeneratorManager(additionalClients) {
  return new StatusGeneratorManager(
    defaultStatusGenerators(),
    [new FileWriter, ...additionalClients],
  );
}

export function sendStatuses() {
  return defaultStatusGeneratorManager().sendStatuses();
}

export function testStatuses(additionalClients = []) {
  return testStatusGeneratorManager(additionalClients).sendStatuses(true);
}
