// When each lane runs, as [minute past the hour, run options] slots plus a fixed second.
// The fast lane keeps the Node cron's cadence: quick updates (without translations) through the
// first minutes of the hour, when rotations change, then full refreshes.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// How long runs and credential renewals are kept for the admin panel's timeline.
export const HISTORY_MS = 48 * HOUR_MS;

const QUICK = { translations: false };
const FULL = { translations: true };

export const LANE_SCHEDULES = {
  fast: {
    second: 15,
    slots: [
      [0, QUICK], [1, QUICK], [2, QUICK], [3, QUICK], [4, QUICK],
      [5, FULL], [10, FULL], [15, FULL], [20, FULL], [30, FULL], [45, FULL],
    ],
  },
  slow: {
    second: 45,
    slots: [[20, {}]],
  },
};

/**
 * The first slot strictly after `now`.
 * @param {{ second: number, slots: Array<[number, object]> }} schedule
 * @param {number} [now] Epoch milliseconds
 * @returns {{ at: number, options: object }} When to run, and the run's options
 */
export function nextSlot(schedule, now = Date.now()) {
  let hour = now - (now % HOUR_MS);

  for (let base of [hour, hour + HOUR_MS]) {
    for (let [minute, options] of schedule.slots) {
      let at = base + minute * MINUTE_MS + schedule.second * 1000;

      if (at > now) {
        return { at, options };
      }
    }
  }

  throw new Error('Schedule has no slots');
}
