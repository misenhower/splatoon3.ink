import dotenv from 'dotenv';
import cron from './cron.mjs';
import { sendTweets } from './twitter/index.mjs';

dotenv.config();

const actions = {
  cron,
  twitter: sendTweets,
}

const command = process.argv[2];
const action = actions[command];
if (action) {
  action();
} else {
  console.error(`Unrecognized command: ${command}`);
}

