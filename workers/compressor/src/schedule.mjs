// When the cron trigger in wrangler.jsonc ("30 0 * * *") starts a run. Keep the two in step.
const HOUR_UTC = 0;
const MINUTE_UTC = 30;

/**
 * @param {number} now Epoch milliseconds
 * @returns {number} The next scheduled run after now, in epoch milliseconds
 */
export function nextScheduledRun(now) {
  let next = new Date(now);
  next.setUTCHours(HOUR_UTC, MINUTE_UTC, 0, 0);

  if (next.getTime() <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime();
}
