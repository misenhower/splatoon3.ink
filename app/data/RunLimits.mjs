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
  // Concurrent SplatNet requests
  requests = pLimit(5);

  // Concurrent image downloads
  images = new PQueue({ concurrency: 4 });

  // Image downloads in progress, by destination, so concurrent updaters download each image once
  imageDownloads = new Map();
}
