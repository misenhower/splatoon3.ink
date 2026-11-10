// Keeps a copy of what a run prints, for the admin panel. The shared app/ code logs through the
// global console, so the console is wrapped once per isolate; AsyncLocalStorage ties each line
// to the run that printed it, even while both lanes work in the same isolate.

import { AsyncLocalStorage } from 'node:async_hooks';

const MAX_LINES = 300;
const MAX_LINE_LENGTH = 600;
const LEVELS = { debug: 'debug', log: 'info', info: 'info', warn: 'warn', error: 'error' };

const current = new AsyncLocalStorage();

function describe(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return value.cause ? `${value.message} (cause: ${describe(value.cause)})` : value.message;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** The lines one run printed. Once full, later lines are counted but not kept. */
export class RunLog {
  lines = [];
  omitted = 0;

  add(level, args) {
    if (this.lines.length >= MAX_LINES) {
      this.omitted++;

      return;
    }

    let text = args.map(describe).join(' ');

    if (text.length > MAX_LINE_LENGTH) {
      text = `${text.slice(0, MAX_LINE_LENGTH)}…`;
    }

    this.lines.push({ at: Date.now(), level, text });
  }

  toJSON() {
    return { lines: this.lines, omitted: this.omitted };
  }
}

let installed = false;

/** Wrap the global console so lines printed inside captureLogs() are also kept. */
export function installLogCapture() {
  if (installed) {
    return;
  }

  installed = true;

  for (let [method, level] of Object.entries(LEVELS)) {
    let original = console[method].bind(console);

    console[method] = (...args) => {
      current.getStore()?.add(level, args);
      original(...args);
    };
  }
}

/**
 * Run a function, keeping what it prints in the given log.
 * @template T
 * @param {RunLog} log
 * @param {() => Promise<T>} callback
 * @returns {Promise<T>} The callback's result
 */
export function captureLogs(log, callback) {
  installLogCapture();

  return current.run(log, callback);
}
