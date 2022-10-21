import { CronJob } from "cron";
import { updateAll } from "./data/index.mjs";
import { warmCaches } from "./splatnet/index.mjs";
import { sendTweets } from "./twitter/index.mjs";

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCaches, null, true);
  new CronJob('15 0,2,5,10,15,30,45 * * * *', async () => {
    await updateAll();
    await sendTweets();
  }, null, true);
}
