import { CronJob } from "cron";
import { updatePrimary, updateLowPriority } from "./data/index.mjs";
import { warmCaches } from "./splatnet/index.mjs";
import { sendStatuses } from "./social/index.mjs";
import { archiveData } from "./data/DataArchiver.mjs";

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCaches, null, true);
  new CronJob('15 0,2,5,10,15,30,45 * * * *', async () => {
    await updatePrimary();
    await sendStatuses();
    await archiveData();
  }, null, true);
  new CronJob('1 * * * *', async () => {
    await updateLowPriority();
    await archiveData();
  }, null, true);
}
