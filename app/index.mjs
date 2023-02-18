import dotenv from 'dotenv';
import consoleStamp from 'console-stamp';
import cron from './cron.mjs';
import { sendStatuses, testStatuses } from './social/index.mjs';
import { updatePrimary, updateAll } from './data/index.mjs';
import { warmCaches } from "./splatnet/index.mjs";
import MastodonClient from './social/clients/MastodonClient.mjs';
import ImageWriter from './social/clients/ImageWriter.mjs';

consoleStamp(console);
dotenv.config();

const actions = {
  cron,
  social: sendStatuses,
  socialTest: testStatuses,
  socialTestMastodon: () => testStatuses([new MastodonClient]),
  socialTestImage: () => testStatuses([new ImageWriter]),
  splatnet: updatePrimary,
  splatnetAll: updateAll,
  warmCaches,
}

const command = process.argv[2];
const action = actions[command];
if (action) {
  action();
} else {
  console.error(`Unrecognized command: ${command}`);
}

