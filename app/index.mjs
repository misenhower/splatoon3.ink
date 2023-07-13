import dotenv from 'dotenv';
import consoleStamp from 'console-stamp';
import cron from './cron.mjs';
import { sendStatuses, testStatuses } from './social/index.mjs';
import { updatePrimary, updateAll } from './data/index.mjs';
import { warmCaches } from "./splatnet/index.mjs";
import MastodonClient from './social/clients/MastodonClient.mjs';
import ImageWriter from './social/clients/ImageWriter.mjs';
import BlueskyClient from './social/clients/BlueskyClient.mjs';
import ThreadsClient from './social/clients/ThreadsClient.mjs';
import { archiveData } from './data/DataArchiver.mjs';

consoleStamp(console);
dotenv.config();

const actions = {
  cron,
  social: sendStatuses,
  socialTest: testStatuses,
  socialTestMastodon: () => testStatuses([new MastodonClient]),
  socialTestBluesky: () => testStatuses([new BlueskyClient]),
  socialTestImage: () => testStatuses([new ImageWriter]),
  socialTestThreads: () => testStatuses([new ThreadsClient]),
  splatnet: updatePrimary,
  splatnetAll: updateAll,
  warmCaches,
  dataArchive: archiveData,
}

const command = process.argv[2];
const action = actions[command];
if (action) {
  action();
} else {
  console.error(`Unrecognized command: ${command}`);
}

