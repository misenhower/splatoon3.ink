import dotenv from 'dotenv';
import consoleStamp from 'console-stamp';
import cron from './cron.mjs';
import { sendStatuses, testStatuses } from './social/index.mjs';
import { update } from './data/index.mjs';
import { warmCaches } from './splatnet/index.mjs';
import MastodonClient from './social/clients/MastodonClient.mjs';
import ImageWriter from './social/clients/ImageWriter.mjs';
import BlueskyClient from './social/clients/BlueskyClient.mjs';
import ThreadsClient from './social/clients/ThreadsClient.mjs';
import { archiveData } from './data/DataArchiver.mjs';
import { sentryInit } from './common/sentry.mjs';
import { sync, syncUpload, syncDownload } from './sync/index.mjs';

consoleStamp(console);
dotenv.config();
sentryInit();

const actions = {
  cron,
  social: sendStatuses,
  socialTest: testStatuses,
  socialTestMastodon: () => testStatuses([new MastodonClient]),
  socialTestBluesky: () => testStatuses([new BlueskyClient]),
  socialTestImage: () => testStatuses([new ImageWriter]),
  socialTestThreads: () => testStatuses([new ThreadsClient]),
  splatnet: update,
  warmCaches,
  dataArchive: archiveData,
  sync,
  syncUpload,
  syncDownload,
};

const command = process.argv[2];
const params = process.argv.slice(3);
const action = actions[command];
if (action) {
  action(...params);
} else {
  console.error(`Unrecognized command: ${command}`);
}

