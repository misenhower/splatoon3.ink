import { CronJob } from 'cron';
import { update } from './data/index.mjs';
import { warmCaches } from './splatnet/index.mjs';
import { sendStatuses } from './social/index.mjs';
import { archiveData } from './data/DataArchiver.mjs';

let updating = false;

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
}
