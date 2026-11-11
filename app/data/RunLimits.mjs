import pLimit from 'p-limit';
import PQueue from 'p-queue';

/**
 * Concurrency limits and shared work for one update run (one lane run in the Worker).
 *
 * These deliberately are not module-level singletons: in Workers, several Durable Objects can
 * share an isolate, and a request started on behalf of one cannot be read by another. Each
 * run creates its own limits, so queued work always belongs to the run that queued it.
 */
export default class RunLimits {
  /**
   * @param {object} [options]
   * @param {number|null} [options.deadline] Epoch ms after which long-running updaters stop
   *   starting new work (the rest continues in a later run)
   * @param {boolean} [options.deferArchive] Hold archive snapshots in `heldSnapshots` instead of
   *   writing them as data is published; the caller writes them later (flushArchive in
   *   app/data/archive.mjs), so archive uploads never delay what follows, such as social posts
   */
  constructor({ deadline = null, deferArchive = false } = {}) {
    this.deadline = deadline;
    this.deferArchive = deferArchive;
  }

  // Archive snapshots waiting to be written, when deferArchive is set, by archive key. Several
  // updaters can save the same file in one run (each region's FestivalUpdater writes the
  // combined festivals.json); a newer copy replaces the one held, so each is written once.
  heldSnapshots = new Map();

  // Set once work was left for a later run because the deadline passed
  incomplete = false;

  /** @returns {boolean} True once the deadline has passed; also marks the run incomplete */
  outOfTime() {
    if (this.deadline !== null && Date.now() >= this.deadline) {
      this.incomplete = true;

      return true;
    }

    return false;
  }

  // Concurrent SplatNet requests
  requests = pLimit(5);

  // Concurrent image downloads
  images = new PQueue({ concurrency: 4 });

  // Image downloads in progress, by destination, so concurrent updaters download each image once
  imageDownloads = new Map();
}
