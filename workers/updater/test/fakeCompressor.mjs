// Stands in for the archive compressor Worker (workers/compressor/) in the Worker tests: the
// updater's COMPRESSOR binding points at that Worker's Durable Object, which needs a container.
// It keeps the same status(), run() and start() shapes, and records runs without running anything.

import { DurableObject } from 'cloudflare:workers';

export class Compressor extends DurableObject {
  async status() {
    return {
      now: Date.now(),
      nextAt: Date.UTC(2030, 0, 1, 0, 30),
      current: (await this.ctx.storage.get('current')) ?? null,
      runs: (await this.ctx.storage.get('runs')) ?? [],
    };
  }

  async run(id) {
    let current = await this.ctx.storage.get('current');
    let run = current?.id === id ? current : ((await this.ctx.storage.get('runs')) ?? []).find(run => run.id === id);

    return run ? { ...run, running: run === current, logs: { lines: [{ at: run.startedAt, level: 'info', text: 'Found 0 dates to archive' }], omitted: 0 } } : null;
  }

  async start({ trigger, dryRun = false }) {
    let current = await this.ctx.storage.get('current');
    if (current) {
      return { ok: false, busy: true, current };
    }

    current = { id: crypto.randomUUID(), trigger, maxDays: 10, dryRun, startedAt: Date.now() };
    await this.ctx.storage.put('current', current);

    return { ok: true, current };
  }

  // Test helper: end the run in progress as the real compressor would.
  async finish(result) {
    let current = await this.ctx.storage.get('current');
    let runs = (await this.ctx.storage.get('runs')) ?? [];

    await this.ctx.storage.put('runs', [{ ...current, ...result, finishedAt: Date.now() }, ...runs]);
    await this.ctx.storage.delete('current');
  }
}

export default {
  fetch: () => new Response('Not found', { status: 404 }),
};
