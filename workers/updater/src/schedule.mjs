// When each lane runs, as [minute past the hour, update mode] slots plus a fixed second.
// The fast lane keeps the Node cron's cadence: quick updates through the first minutes of the
// hour (when rotations change), then regular refreshes.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const LANE_SCHEDULES = {
  fast: {
    second: 15,
    slots: [
      [0, 'quick'], [1, 'quick'], [2, 'quick'], [3, 'quick'], [4, 'quick'],
      [5, 'default'], [10, 'default'], [15, 'default'], [20, 'default'], [30, 'default'], [45, 'default'],
    ],
  },
  slow: {
    second: 45,
    slots: [[20, 'all']],
  },
};

/**
 * The first slot strictly after `now`.
 * @param {{ second: number, slots: Array<[number, string]> }} schedule
 * @param {number} [now] Epoch milliseconds
 * @returns {{ at: number, mode: string }} When to run, and in which update mode
 */
export function nextSlot(schedule, now = Date.now()) {
  let hour = now - (now % HOUR_MS);

  for (let base of [hour, hour + HOUR_MS]) {
    for (let [minute, mode] of schedule.slots) {
      let at = base + minute * MINUTE_MS + schedule.second * 1000;

      if (at > now) {
        return { at, mode };
      }
    }
  }

  throw new Error('Schedule has no slots');
}
