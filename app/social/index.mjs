import FileWriter from "./clients/FileWriter.mjs";
import ImageWriter from "./clients/ImageWriter.mjs";
import MastodonClient from "./clients/MastodonClient.mjs";
import TwitterClient from "./clients/TwitterClient.mjs";
import DailyDropGearStatus from "./generators/DailyDropGearStatus.mjs";
import RegularGearStatus from "./generators/RegularGearStatus.mjs";
import SalmonRunGearStatus from "./generators/SalmonRunGearStatus.mjs";
import SalmonRunStatus from "./generators/SalmonRunStatus.mjs";
import SchedulesStatus from "./generators/SchedulesStatus.mjs";
import SplatfestStatus from "./generators/SplatfestStatus.mjs";
import SplatfestResultsStatus from "./generators/SplatfestResultsStatus.mjs";
import StatusGeneratorManager from "./StatusGeneratorManager.mjs"
import SalmonRunUpcomingStatus from "./generators/SalmonRunUpcomingStatus.mjs";
import EggstraWorkStatus from "./generators/EggstraWorkStatus.mjs";
import EggstraWorkUpcomingStatus from "./generators/EggstraWorkUpcomingStatus.mjs";
import BlueskyClient from "./clients/BlueskyClient.mjs";
import ChallengeStatus from "./generators/ChallengeStatus.mjs";

function defaultStatusGenerators() {
  return [
    new SchedulesStatus,
    new DailyDropGearStatus,
    new RegularGearStatus,
    new ChallengeStatus,
    new SalmonRunStatus,
    new SalmonRunUpcomingStatus,
    new SalmonRunGearStatus,
    new SplatfestStatus,
    new SplatfestResultsStatus,
    new EggstraWorkStatus,
    new EggstraWorkUpcomingStatus,
  ];
}

function defaultClients() {
  return [
    new TwitterClient,
    new MastodonClient,
    new BlueskyClient,
    new ImageWriter,
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
