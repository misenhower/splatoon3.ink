const two = number => String(number).padStart(2, '0');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(ms, utc) {
  let date = new Date(ms);

  return utc
    ? { month: date.getUTCMonth(), day: date.getUTCDate(), h: date.getUTCHours(), m: date.getUTCMinutes(), s: date.getUTCSeconds() }
    : { month: date.getMonth(), day: date.getDate(), h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() };
}

/**
 * @param {number} ms Epoch milliseconds
 * @param {{ seconds?: boolean, utc?: boolean }} [options]
 * @returns {string} A 24-hour clock time such as 14:20:15
 */
export function formatClock(ms, { seconds = true, utc = true } = {}) {
  if (ms == null) return '–';

  let { h, m, s } = parts(ms, utc);

  return seconds ? `${two(h)}:${two(m)}:${two(s)}` : `${two(h)}:${two(m)}`;
}

/**
 * The clock time, with the date in front when it is not the same day as `now`.
 * @param {number} ms
 * @param {number} now
 * @param {{ seconds?: boolean, utc?: boolean }} [options]
 * @returns {string} For example 14:20:15, or Nov 8 14:20:15
 */
export function formatWhen(ms, now, options = {}) {
  if (ms == null) return '–';

  let utc = options.utc ?? true;
  let then = parts(ms, utc);
  let today = parts(now, utc);
  let clock = formatClock(ms, options);

  return then.day === today.day && then.month === today.month ? clock : `${MONTHS[then.month]} ${then.day} ${clock}`;
}

/**
 * @param {number|null} ms A length of time in milliseconds
 * @returns {string} For example 0.4s, 9s, 1m 37s, 2h 05m, 40d
 */
export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '–';

  let abs = Math.abs(ms);

  if (abs < 1000) return `${(abs / 1000).toFixed(1)}s`;

  let total = Math.round(abs / 1000);

  if (total < 60) return `${total}s`;

  let minutes = Math.floor(total / 60);

  if (minutes < 60) return `${minutes}m ${two(total % 60)}s`;

  let hours = Math.floor(minutes / 60);

  if (hours < 48) return `${hours}h ${two(minutes % 60)}m`;

  return `${Math.floor(hours / 24)}d`;
}

/**
 * @param {number} ms Epoch milliseconds
 * @param {number} now
 * @returns {string} For example "in 3m 12s", "2m 05s ago", or "now"
 */
export function formatRelative(ms, now) {
  if (ms == null) return '–';

  let delta = ms - now;

  if (Math.abs(delta) < 1000) return 'now';

  return delta > 0 ? `in ${formatDuration(delta)}` : `${formatDuration(delta)} ago`;
}

export const LANE_LABELS = { fast: 'Fast lane', slow: 'Slow lane' };

export const ROW_LABELS = { fast: 'Fast lane', slow: 'Slow lane', auth: 'Nintendo auth', social: 'Social posts' };

export const STATE_LABELS = {
  ok: 'OK',
  failed: 'Failed',
  incomplete: 'Unfinished',
  partial: 'Partly failed',
  running: 'Running',
  queued: 'Queued',
  upcoming: 'Upcoming',
};

export const STATE_TONES = {
  ok: 'text-ok',
  failed: 'text-bad',
  incomplete: 'text-warn',
  partial: 'text-warn',
  running: 'text-busy',
  queued: 'text-busy',
  upcoming: 'text-muted',
};

export const TRIGGER_LABELS = {
  scheduled: 'Scheduled',
  retry: 'Retry',
  continuation: 'Continuation',
  manual: 'Manual',
};
