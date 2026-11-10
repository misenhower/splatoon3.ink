// Where the Timeline page is looking. The timeline and the activity list both follow `cursor`,
// which is how scrolling one moves the other.

import { reactive } from 'vue';

function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export const ZOOMS = [3, 6, 12];

export const view = reactive({
  // The moment under the timeline's marker, in epoch milliseconds.
  cursor: 0,

  // What moved the cursor last: "chart" or "list" (scrolled by hand), "now" (following the
  // clock), "reveal" (bringing a selected item into the timeline), or "jump".
  source: 'now',

  // True while the cursor follows the clock.
  live: true,

  // How much time the timeline has in view, in milliseconds (set by the timeline; less than
  // `hours` on a narrow screen).
  span: 3 * 60 * 60_000,

  // When the cursor was last moved by hand, so following the clock does not fight a scroll.
  scrubbedAt: 0,
  dragging: false,

  // How many hours the timeline shows at once.
  hours: ZOOMS.includes(stored('admin.zoom', 3)) ? stored('admin.zoom', 3) : 3,

  // Which items the list shows; the timeline dims the rest.
  filter: { row: 'all', problems: false },
});

export function setZoom(hours) {
  view.hours = hours;

  try {
    localStorage.setItem('admin.zoom', JSON.stringify(hours));
  } catch {
    // Private windows may refuse storage; the choice then lasts for this visit.
  }
}

/**
 * @param {number} cursor
 * @param {string} source See `view.source`
 */
export function moveCursor(cursor, source) {
  view.cursor = cursor;
  view.source = source;
}

/**
 * The timeline or the list was scrolled by hand.
 * @param {number} cursor The moment it was scrolled to
 * @param {'chart'|'list'} source
 * @param {boolean} atNow Whether it came to rest on the present, which resumes following the clock
 */
export function scrub(cursor, source, atNow) {
  view.live = atNow;
  view.scrubbedAt = Date.now();
  moveCursor(cursor, source);
}
