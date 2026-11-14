// Keeps what the compressor prints and serves it to the Compressor Durable Object, which fetches
// it every few seconds (GET /log?after=N) and keeps it with the run for the admin panel. Once
// the work is done the answer also carries the exit code, which is how the object learns how
// the run went. Without LOG_PORT (a local `docker run`) lines only go to stdout.

import http from 'node:http';
import { format } from 'node:util';

const LEVELS = { debug: 'debug', log: 'info', info: 'info', warn: 'warn', error: 'error' };
const MAX_LINE_LENGTH = 600;
// How long to wait at the end for the object to fetch the report and the last lines. It checks
// every few seconds, so this only runs out if it has stopped checking.
const COLLECT_TIMEOUT_MS = 2 * 60 * 1000;

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

/**
 * Keep console output and serve it on `port`.
 * @param {string|undefined} port
 * @returns {{ close: (code: number) => Promise<void> }} close() reports the exit code, waits
 *   until it and every line have been fetched (or a timeout), then stops serving; await it
 *   before exiting
 */
export function serveLogs(port) {
  if (!port) {
    return { close: async () => {} };
  }

  let lines = [];
  let done = false;
  let exitCode = null;
  let collected = () => {};

  for (let [method, level] of Object.entries(LEVELS)) {
    let original = console[method].bind(console);

    console[method] = (...args) => {
      // printf-style placeholders are filled in the way console does it.
      let text = typeof args[0] === 'string' && /%[sdifjoOc]/.test(args[0])
        ? format(...args)
        : args.map(describe).join(' ');

      lines.push({ at: Date.now(), level, text: text.length > MAX_LINE_LENGTH ? `${text.slice(0, MAX_LINE_LENGTH)}…` : text });
      original(...args);
    };
  }

  let server = http.createServer((request, response) => {
    let url = new URL(request.url, 'http://container');

    if (request.method !== 'GET' || url.pathname !== '/log') {
      response.writeHead(404).end();

      return;
    }

    let after = Math.max(0, Number(url.searchParams.get('after')) || 0);
    let finished = done;

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ lines: lines.slice(after), next: lines.length, done: finished, exitCode }));

    if (finished) {
      collected();
    }
  });

  server.listen(Number(port));

  return {
    async close(code) {
      exitCode = code;
      done = true;

      await Promise.race([
        new Promise(resolve => { collected = resolve; }),
        new Promise(resolve => setTimeout(resolve, COLLECT_TIMEOUT_MS).unref()),
      ]);

      // Lets the last response finish sending.
      await new Promise(resolve => server.close(resolve));
    },
  };
}
