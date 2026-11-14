// One Durable Object that runs the archive compressor's container to completion and keeps a
// short history of runs. The container does the work (container/compress.mjs) and serves what
// it prints, and at the end how it went, on LOG_PORT (container/logServer.mjs).
//
// While a run goes on, an alarm every few seconds fetches the new lines and stores them with
// the run. Nothing depends on this object staying in memory: it can be evicted mid-run, and the
// next alarm carries on from what is stored. The run ends when the container reports its exit
// code; the container waits until that report has been fetched before it exits.

import * as Sentry from '@sentry/core';
import { DurableObject } from 'cloudflare:workers';
import { nextScheduledRun } from './schedule.mjs';

const HISTORY = 30;
// How often the alarm fetches log lines and checks on the container while a run goes on.
const CHECK_INTERVAL_MS = 3000;
// The container keeps running this long without hearing from this object.
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
// A run that goes on this long is stuck (a day takes a few minutes); stop it.
const MAX_RUNTIME_MS = 3 * 60 * 60 * 1000;
// A container that is not running this long after its run started has stopped.
const START_GRACE_MS = 60 * 1000;
const LOG_PORT = 8080;
const MAX_LOG_LINES = 500;
const STOPPED = 'The container stopped before it reported how the run went';

export class Compressor extends DurableObject {
  // While this object stays in memory, monitor() reports a crashed container's exit code.
  #watching = null;

  /**
   * @returns {Promise<{ now: number, nextAt: number, current: object|null, runs: object[] }>} The
   *   run in progress, recent runs (newest first), and when the next scheduled run starts
   */
  async status() {
    let now = Date.now();

    return {
      now,
      nextAt: nextScheduledRun(now),
      current: (await this.ctx.storage.get('current')) ?? null,
      runs: (await this.ctx.storage.get('runs')) ?? [],
    };
  }

  /**
   * One run with what it printed, or null if it is no longer kept.
   * @param {string} id
   */
  async run(id) {
    let current = await this.ctx.storage.get('current');
    let run = current?.id === id
      ? current
      : ((await this.ctx.storage.get('runs')) ?? []).find(run => run.id === id);

    if (!run) {
      return null;
    }

    let { lines, omitted } = (await this.ctx.storage.get(`log:${id}`)) ?? { lines: [], omitted: 0 };

    return { ...run, running: run === current, logs: { lines, omitted } };
  }

  /**
   * Start a run unless one is going.
   * @param {{ trigger: 'scheduled'|'manual', maxDays?: number, dryRun?: boolean }} options
   */
  async start({ trigger, maxDays = 10, dryRun = false }) {
    if (!Number.isInteger(maxDays) || maxDays < 1) {
      return { ok: false, error: 'maxDays must be a whole number of at least 1' };
    }

    let current = await this.ctx.storage.get('current');
    if (current) {
      return { ok: false, busy: true, current };
    }

    // The last run has reported and finished, but its container can take a moment to exit.
    if (this.ctx.container.running) {
      return { ok: false, busy: true, error: 'The last run\'s container is still stopping. Try again in a minute.' };
    }

    current = { id: crypto.randomUUID(), trigger, maxDays, dryRun, startedAt: Date.now() };
    await this.ctx.storage.put('current', current);

    try {
      this.ctx.container.start({ enableInternet: true, env: this.#containerEnv(current) });
      await this.ctx.container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);
      await this.ctx.storage.setAlarm(Date.now() + CHECK_INTERVAL_MS);
    } catch (e) {
      let run = await this.#finish({ ok: false, error: `Could not start the container: ${e?.message ?? e}` });

      return { ok: false, run };
    }

    this.#watch(current.id);

    return { ok: true, current };
  }

  async alarm() {
    let current = await this.ctx.storage.get('current');
    if (!current) {
      return;
    }

    // The container is not listening for the first moment, so a failed fetch is expected.
    let report = await this.#fetchLogs(current.id).catch(() => null);

    if (report?.done) {
      let exitCode = Number.isInteger(report.exitCode) ? report.exitCode : null;

      await this.#finish(exitCode === 0 ? { ok: true, exitCode } : { ok: false, exitCode, error: `The compressor exited with code ${exitCode}` });

      return;
    }

    let elapsed = Date.now() - current.startedAt;

    if (current.crash) {
      await this.#finish({ ok: false, ...current.crash });

      return;
    }

    if (!this.ctx.container.running && elapsed > START_GRACE_MS) {
      // It crashed, or was stopped, before reporting. Its log shows how far it got.
      await this.#finish({ ok: false, lost: true, exitCode: null, error: STOPPED });

      return;
    }

    if (elapsed > MAX_RUNTIME_MS) {
      await this.ctx.container.destroy('Compression ran too long');
      await this.#finish({ ok: false, exitCode: null, error: 'Stopped after running for three hours' });

      return;
    }

    await this.ctx.container.setInactivityTimeout(INACTIVITY_TIMEOUT_MS);
    await this.ctx.storage.setAlarm(Date.now() + CHECK_INTERVAL_MS);
    this.#watch(current.id);
  }

  // Store the container's new log lines. Returns its report: done, and the exit code once done.
  async #fetchLogs(id) {
    let log = (await this.ctx.storage.get(`log:${id}`)) ?? { lines: [], omitted: 0, next: 0 };
    let response = await this.ctx.container.getTcpPort(LOG_PORT).fetch(`http://container/log?after=${log.next ?? 0}`);

    if (!response.ok) {
      return null;
    }

    let { lines, next, done, exitCode } = await response.json();

    if (lines.length) {
      await this.#appendLog(id, lines, next);
    }

    return { done, exitCode };
  }

  async #appendLog(id, lines, next) {
    let log = (await this.ctx.storage.get(`log:${id}`)) ?? { lines: [], omitted: 0, next: 0 };

    log.next = next ?? log.next;

    for (let { at, level, text } of lines) {
      if (log.lines.length >= MAX_LOG_LINES) {
        log.omitted++;
      } else {
        log.lines.push({ at: Number(at) || Date.now(), level: String(level ?? 'info'), text: String(text ?? '') });
      }
    }

    await this.ctx.storage.put(`log:${id}`, log);
  }

  #containerEnv({ maxDays, dryRun }) {
    let env = {
      AWS_S3_ENDPOINT: this.env.AWS_S3_ENDPOINT,
      AWS_REGION: this.env.AWS_REGION,
      AWS_S3_ARCHIVE_BUCKET: this.env.AWS_S3_ARCHIVE_BUCKET,
      AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
      LOG_PORT: String(LOG_PORT),
      MAX_DAYS: String(maxDays),
      DRY_RUN: String(dryRun),
    };

    // Unset values are left out rather than passed as "undefined".
    return Object.fromEntries(Object.entries(env).filter(([, value]) => value));
  }

  // A container that dies (out of memory, say) never reports; monitor() gives its exit code if
  // this object is still in memory. It is kept with the run for the next alarm to finish, so
  // the failure is reported from the alarm. A clean exit comes after the report, which already
  // ended the run, so only failures count here.
  #watch(id) {
    if (this.#watching) {
      return;
    }

    this.#watching = this.ctx.container.monitor()
      .then(
        () => null,
        async error => {
          let current = await this.ctx.storage.get('current');

          if (current?.id === id) {
            let crash = { exitCode: error?.exitCode ?? null, error: String(error?.message ?? error) };

            await this.ctx.storage.put('current', { ...current, crash });
          }
        },
      )
      .finally(() => {
        this.#watching = null;
      });
  }

  async #finish(result) {
    let current = await this.ctx.storage.get('current');
    if (!current) {
      return;
    }

    let run = { ...current, ...result, finishedAt: Date.now() };

    delete run.crash;
    let kept = [run, ...((await this.ctx.storage.get('runs')) ?? [])];

    await this.ctx.storage.put('runs', kept.slice(0, HISTORY));
    await this.ctx.storage.delete(kept.slice(HISTORY).map(old => `log:${old.id}`));
    await this.ctx.storage.delete('current');
    await this.ctx.storage.deleteAlarm();

    console[run.ok ? 'info' : 'error'](JSON.stringify({ event: 'compress-run', ...run }));

    if (!run.ok) {
      Sentry.captureException(new Error(`Archive compression failed: ${run.error}`), {
        tags: { trigger: run.trigger, dryRun: run.dryRun },
        extra: { run },
      });
    }

    return run;
  }
}
