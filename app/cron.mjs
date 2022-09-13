import { CronJob } from "cron";
import { updateAll } from "./data/index.mjs";
import { warmCache } from "./splatnet/index.mjs";
import { sendTweets } from "./twitter/index.mjs";

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCache, null, true);
  new CronJob('10 0 * * * *', async () => {
    await updateAll();
    await sendTweets();
  }, null, true);
}
