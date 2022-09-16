import { CronJob } from "cron";
import { updateAll } from "./data/index.mjs";
import { warmCaches } from "./splatnet/index.mjs";
import { sendTweets } from "./twitter/index.mjs";

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCaches, null, true);
  new CronJob('10 0 * * * *', async () => {
    await updateAll();
    await sendTweets();
  }, null, true);
}
