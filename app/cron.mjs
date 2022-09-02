import { CronJob } from "cron";
import { sendTweets } from "./twitter/index.mjs";

export default function() {
  new CronJob('1 16 * * *', sendTweets, null, true);
}
