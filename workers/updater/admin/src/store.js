// One shared, polled copy of the updater's status and log for the whole panel.

import { computed, markRaw, reactive } from 'vue';
import { api } from './api.js';
import { buildActivity } from './lib/activity.js';
import { HOUR, MINUTE } from './lib/runs.js';

const STATUS_INTERVAL = 5000;
const LOG_INTERVAL = 15000;

// History is loaded this much at a time, working backwards from now.
const HISTORY_CHUNK = 6 * HOUR;

function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export const store = reactive({
  status: null,
  error: null,
  loadedAt: 0,
  // Server time minus this browser's clock, so countdowns follow the updater's clock.
  clockOffset: 0,
  now: Date.now(),

  // Runs (by lane, then id), credential renewals (by region, then start time) and social posts
  // (by id) loaded so far. Everything from `from` up to now is here; status polls keep the
  // newest end current, and the timeline asks for more as it is scrolled back.
  history: {
    runs: { fast: {}, slow: {} },
    auth: {},
    posts: {},
    from: null,
    loading: false,
    error: null,
  },

  log: [],
  logError: null,

  // Accounts, statuses, delivery times and the post log; loaded while the Social page is open.
  social: null,
  socialError: null,

  // The action in flight, for disabling buttons: for example "run:fast".
  busy: null,
  toast: null,

  utc: stored('admin.utc', true),
});

// Everything on the timeline, newest first. See lib/activity.js.
export const activity = computed(() => buildActivity({ status: store.status, history: store.history }));

// The oldest moment the updater still has history for.
export const historyStart = computed(() => store.status ? store.status.now - (store.status.historyMs ?? 48 * HOUR) : 0);

function merge({ runs = {}, auth = {}, posts = [] }) {
  let history = store.history;

  for (let [lane, list] of Object.entries(runs)) {
    for (let run of list ?? []) {
      (history.runs[lane] ??= {})[run.id] = markRaw(run);
    }
  }

  for (let [region, events] of Object.entries(auth)) {
    for (let event of events ?? []) {
      (history.auth[region] ??= {})[event.at] = markRaw(event);
    }
  }

  for (let post of posts ?? []) {
    history.posts[post.id ?? `${post.at}:${post.generator?.key}:${post.client?.key}`] = markRaw(post);
  }
}

async function fetchActivity(from, to) {
  merge(await api.activity(from, to));
}

let loading = null;

/**
 * Load history back to a moment, if it is not loaded already and is still kept.
 * @param {number} [from] Defaults to one more chunk before what is loaded
 */
export async function loadHistory(from) {
  let history = store.history;

  // One request at a time; a second caller waits, then loads whatever is still missing.
  while (loading) {
    await loading;
  }

  if (history.from === null) return;

  from = Math.max(from ?? history.from - HISTORY_CHUNK, historyStart.value);

  if (from >= history.from) return;

  // Whole chunks, so a short scroll does not turn into many small requests.
  from = Math.max(Math.min(from, history.from - HISTORY_CHUNK), historyStart.value);
  history.loading = true;

  loading = fetchActivity(from, history.from + MINUTE)
    .then(() => {
      history.from = from;
      history.error = null;
    })
    .catch(error => history.error = error.message)
    .finally(() => {
      history.loading = false;
      loading = null;
    });

  await loading;
}

export function setUtc(utc) {
  store.utc = utc;

  try {
    localStorage.setItem('admin.utc', JSON.stringify(utc));
  } catch {
    // Private windows may refuse storage; the choice then lasts for this visit.
  }
}

let toastTimer = null;

export function showToast(text, kind = 'info') {
  store.toast = { text, kind };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => store.toast = null, kind === 'error' ? 8000 : 4000);
}

export async function refreshStatus() {
  try {
    let status = await api.status();
    let previous = store.status?.now ?? null;

    merge({
      runs: Object.fromEntries(Object.entries(status.lanes).map(([lane, state]) => [lane, state.history])),
      auth: Object.fromEntries(Object.entries(status.auth).map(([region, auth]) => [region, auth.events])),
      posts: status.posts,
    });

    store.status = status;
    store.clockOffset = status.now - Date.now();
    store.now = status.now;
    store.loadedAt = Date.now();
    store.error = null;

    if (store.history.from === null) {
      store.history.from = status.now;
      loadHistory();
    } else if (status.now - previous > 10 * MINUTE) {
      // The tab was asleep for longer than a status poll covers; fill in what was missed.
      fetchActivity(previous - MINUTE, status.now + MINUTE).catch(error => store.history.error = error.message);
    }
  } catch (error) {
    store.error = error.message;
  }
}

export async function refreshLog() {
  try {
    store.log = (await api.log()).lines;
    store.logError = null;
  } catch (error) {
    store.logError = error.message;
  }
}

export async function refreshSocial() {
  try {
    store.social = await api.social();
    store.socialError = null;
  } catch (error) {
    store.socialError = error.message;
  }
}

/**
 * Send an action, then refresh so the panel shows its effect.
 * @param {string} key What is busy while this runs, such as "run:fast"
 * @param {string} path
 * @param {object} body
 * @param {string|null} done The confirmation to show, or null to show none
 * @returns {Promise<object|null>} The updater's answer, or null if it refused
 */
export async function act(key, path, body, done) {
  if (store.busy) return null;

  store.busy = key;

  try {
    let result = await api.post(path, body);

    if (done) showToast(done);

    return result;
  } catch (error) {
    showToast(error.message, 'error');

    return null;
  } finally {
    store.busy = null;
    await refreshStatus();
    refreshLog();
  }
}

let started = false;

export function startPolling() {
  if (started) return;

  started = true;
  refreshStatus();
  refreshLog();

  setInterval(() => store.now = Date.now() + store.clockOffset, 1000);
  setInterval(() => document.hidden || refreshStatus(), STATUS_INTERVAL);
  setInterval(() => document.hidden || refreshLog(), LOG_INTERVAL);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshStatus();
      refreshLog();
    }
  });
}
