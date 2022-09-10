import { CronJob } from "cron";
import { warmCache } from "./splatnet/index.mjs";

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCache, null, true);
}
