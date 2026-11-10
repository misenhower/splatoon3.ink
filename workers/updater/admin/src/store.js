// One shared, polled copy of the updater's status and log for the whole panel.

import { computed, reactive } from 'vue';
import { api } from './api.js';
import { collectRuns } from './lib/runs.js';

const STATUS_INTERVAL = 5000;
const LOG_INTERVAL = 15000;

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

export const runs = computed(() => collectRuns(store.status));

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

    store.status = status;
    store.clockOffset = status.now - Date.now();
    store.now = status.now;
    store.loadedAt = Date.now();
    store.error = null;
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
