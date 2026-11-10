// Clock formatting that follows the panel's UTC/local choice.

import { store } from './store.js';
import { formatClock, formatWhen } from './lib/format.js';

export const clock = {
  time: (ms, seconds = true) => formatClock(ms, { seconds, utc: store.utc }),
  when: (ms, seconds = true) => formatWhen(ms, store.now, { seconds, utc: store.utc }),
  zone: () => store.utc ? 'UTC' : 'local',
};
