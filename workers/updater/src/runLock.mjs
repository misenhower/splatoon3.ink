// A lane's run lock, kept in the private R2 bucket rather than in the Scheduler's own storage.
//
// Cloudflare can replace a Durable Object instance while its alarm is still running: the alarm
// restarts on a new instance, but the old one carries on with what it was doing (posting, for
// example) and can no longer write to its own storage. It can still write to R2, so the lock
// lives there. A run refreshes it every few seconds and deletes it when it ends; a run that
// finds a fresh lock from another run waits for it, like the old cron did.

const HEARTBEAT_MS = 10 * 1000;

// A lock not refreshed for this long belongs to a run that has stopped.
export const STALE_MS = 45 * 1000;

export class RunLock {
  #bucket;
  #key;
  #id = null;
  #timer = null;
  #writing = Promise.resolve();
  #stopped = false;

  /**
   * @param {object} bucket The private R2 bucket binding
   * @param {string} lane
   */
  constructor(bucket, lane) {
    this.#bucket = bucket;
    this.#key = `locks/${lane}.json`;
  }

  /**
   * @returns {Promise<object|null>} The lock of a run that is still going, or null
   */
  async holder() {
    let lock = await this.#read();

    return lock && Date.now() - lock.heartbeatAt <= STALE_MS ? lock : null;
  }

  /**
   * Take the lock for a run and keep it fresh until release().
   * @param {{ id: string, trigger: string, startedAt: number }} run
   */
  async acquire(run) {
    this.#id = run.id;
    await this.#write(run);
    this.#timer = setInterval(() => {
      this.#writing = this.#writing.then(() => this.#write(run)).catch(() => {});
    }, HEARTBEAT_MS);
  }

  // Stop refreshing the lock and delete it, unless another run has taken it since.
  async release() {
    this.#stopped = true;
    clearInterval(this.#timer);
    await this.#writing;

    if (this.#id && (await this.#read())?.id === this.#id) {
      await this.#bucket.delete(this.#key);
    }
  }

  async #read() {
    let object = await this.#bucket.get(this.#key);

    return object ? object.json().catch(() => null) : null;
  }

  async #write(run) {
    if (this.#stopped) {
      return;
    }

    await this.#bucket.put(this.#key, JSON.stringify({ ...run, heartbeatAt: Date.now() }), {
      httpMetadata: { contentType: 'application/json' },
    });
  }
}
