import { CronJob } from 'cron';
import { setTimeout as sleep } from 'node:timers/promises';
import { update } from './data/index.mjs';
import { warmCaches } from './splatnet/index.mjs';
import { sendStatuses } from './social/index.mjs';
import { archiveData } from './data/DataArchiver.mjs';
import { generateArchives } from './data/ArchiveGenerator.mjs';
import { updateAvatars } from './social/updateAvatars.mjs';

let updating = false;
const restartGracePeriod = 5 * 60 * 1000; // 5 minutes

async function updateIfNotUpdating(mode) {
  if (updating) {
    console.log('[Cron] Update already in progress');

    return;
  }

  updating = true;

  try {
    await update(mode);
    await sendStatuses();
    await archiveData();
  } finally {
    updating = false;
  }
}

// nxapi caches remote config for the life of the process, so restart daily to refresh it.
async function restartToRefreshConfig() {
  const restartDeadline = Date.now() + restartGracePeriod;

  if (updating) {
    console.log('[Cron] Restart pending; waiting for in-progress update to finish...');

    while (updating && Date.now() < restartDeadline) {
      await sleep(5000);
    }
  }

  if (updating) {
    console.warn('[Cron] Update did not finish within 5 minutes; restarting anyway');
  }

  updating = true;

  console.log('[Cron] Exiting to refresh nxapi remote config; container will restart');
  process.exit(0);
}

export default function() {
  new CronJob('5,20,35,50 * * * *', warmCaches, null, true);
  new CronJob('15 0,1,2,3,4 * * * *', () => {
    return updateIfNotUpdating('quick');
  }, null, true);
  new CronJob('15 5,10,15,30,45 * * * *', () => {
    return updateIfNotUpdating('default');
  }, null, true);
  new CronJob('20 * * * *', () => {
    return updateIfNotUpdating('all');
  }, null, true);

  new CronJob('30 * * * *', updateAvatars, null, true);
  new CronJob('30 0 * * *', () => generateArchives(10), null, true, 'UTC');
  new CronJob('0 55 4 * * *', restartToRefreshConfig, null, true);
}
