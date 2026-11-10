import FileWriter from './clients/FileWriter.mjs';
import ImageWriter from './clients/ImageWriter.mjs';
import MastodonClient from './clients/MastodonClient.mjs';
// import TwitterClient from './clients/TwitterClient.mjs';
import BufferTwitterClient from './clients/BufferTwitterClient.mjs';
import DailyDropGearStatus from './generators/DailyDropGearStatus.mjs';
import RegularGearStatus from './generators/RegularGearStatus.mjs';
// import SalmonRunGearStatus from './generators/SalmonRunGearStatus.mjs';
import SalmonRunStatus from './generators/SalmonRunStatus.mjs';
import SchedulesStatus from './generators/SchedulesStatus.mjs';
import SplatfestStatus from './generators/SplatfestStatus.mjs';
import SplatfestResultsStatus from './generators/SplatfestResultsStatus.mjs';
import StatusGeneratorManager from './StatusGeneratorManager.mjs';
import SalmonRunUpcomingStatus from './generators/SalmonRunUpcomingStatus.mjs';
import EggstraWorkStatus from './generators/EggstraWorkStatus.mjs';
import EggstraWorkUpcomingStatus from './generators/EggstraWorkUpcomingStatus.mjs';
import BlueskyClient from './clients/BlueskyClient.mjs';
import ChallengeStatus from './generators/ChallengeStatus.mjs';
import ThreadsClient from './clients/ThreadsClient.mjs';

export function defaultStatusGenerators(options = {}) {
  return [
    new SchedulesStatus(options),
    new DailyDropGearStatus(options),
    new RegularGearStatus(options),
    new ChallengeStatus(options),
    new SalmonRunStatus(options),
    new SalmonRunUpcomingStatus(options),
    // new SalmonRunGearStatus(options),
    new SplatfestStatus('NA', options),
    new SplatfestStatus('EU', options),
    new SplatfestStatus('JP', options),
    new SplatfestStatus('AP', options),
    new SplatfestResultsStatus('NA', options),
    new SplatfestResultsStatus('EU', options),
    new SplatfestResultsStatus('JP', options),
    new SplatfestResultsStatus('AP', options),
    new EggstraWorkStatus(options),
    new EggstraWorkUpcomingStatus(options),
  ];
}

export function defaultClients(locale = 'en-US') {
  if (locale === 'ja-JP') {
    return [
      new BufferTwitterClient({
        key: 'twitter.jp',
        name: 'Twitter (Buffer, JP)',
        locale,
        envPrefix: 'BUFFER_TWITTER_JP',
      }),
      new BlueskyClient({
        key: 'bluesky.jp',
        name: 'Bluesky (JP)',
        locale,
        envPrefix: 'BLUESKY_JP',
      }),
    ];
  }

  return [
    // new TwitterClient,
    new BufferTwitterClient,
    new MastodonClient,
    new BlueskyClient,
    new ThreadsClient,
    new ImageWriter,
  ];
}

export function defaultStatusGeneratorManager(locale = 'en-US') {
  return new StatusGeneratorManager(
    defaultStatusGenerators({ locale }),
    defaultClients(locale),
  );
}

export function testStatusGeneratorManager(additionalClients) {
  return new StatusGeneratorManager(
    defaultStatusGenerators(),
    [new FileWriter, ...additionalClients],
  );
}

export const SOCIAL_LOCALES = ['en-US', 'ja-JP'];

/**
 * Post whatever is due to every account, in both languages.
 * @returns {Promise<object[]>} What was posted and what failed (see StatusGeneratorManager.events)
 */
export async function sendStatuses() {
  const managers = SOCIAL_LOCALES.map(locale => defaultStatusGeneratorManager(locale));
  const events = await Promise.all(managers.map(manager => manager.sendStatuses()));

  return events.flat().filter(Boolean).sort((a, b) => a.at - b.at);
}

export function testStatuses(additionalClients = []) {
  return testStatusGeneratorManager(additionalClients).sendStatuses(true);
}
