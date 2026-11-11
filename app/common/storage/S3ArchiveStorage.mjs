import { AwsClient } from 'aws4fetch';

const ATTEMPTS = 3;
const TIMEOUT_MS = 8000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The archive area for the Worker: each snapshot goes straight to an S3-compatible bucket
 * (DigitalOcean Spaces). The Node runner writes snapshots to storage/archive/ instead and
 * uploads them afterwards (DataArchiver); both end up with the same objects, so the archive
 * tools (compress, verify, prune) do not care which one wrote a file.
 *
 * Only writing is supported: nothing reads snapshots back through storage.
 */
export default class S3ArchiveStorage {
  #client;
  #base;
  #retryDelayMs;

  /**
   * @param {object} options
   * @param {string} options.endpoint For example https://nyc3.digitaloceanspaces.com
   * @param {string} options.region
   * @param {string} options.bucket
   * @param {string} options.accessKeyId
   * @param {string} options.secretAccessKey
   * @param {number} [options.retryDelayMs] The wait before the first retry; later ones wait longer
   */
  constructor({ endpoint, region, bucket, accessKeyId, secretAccessKey, retryDelayMs = 250 }) {
    // Retries are done here, so that a request that never gets an answer is retried too.
    this.#client = new AwsClient({ accessKeyId, secretAccessKey, region, service: 's3', retries: 0 });
    this.#base = `${endpoint.replace(/\/+$/, '')}/${bucket}`;
    this.#retryDelayMs = retryDelayMs;
  }

  /**
   * Snapshots are filed by day: "2026-11-08.12-00-00.gear.json" is stored as
   * "2026/11/08/2026-11-08.12-00-00.gear.json".
   * @param {string} key A snapshot name starting with its date
   * @returns {string} The object key in the bucket
   */
  static objectKey(key) {
    let file = key.split('/').pop();
    let date = file.match(/^(\d{4})-(\d{2})-(\d{2})\b/);

    if (!date) {
      throw new Error(`Archive file names start with a date: ${key}`);
    }

    return `${date[1]}/${date[2]}/${date[3]}/${file}`;
  }

  /**
   * @param {string} key
   * @param {string} text
   * @param {{ contentType?: string }} [options]
   */
  async writeText(key, text, { contentType = 'application/json' } = {}) {
    let url = `${this.#base}/${S3ArchiveStorage.objectKey(key)}`;
    let failure;

    // Hourly snapshots are written again by the next run, but X-Rank snapshots are stamped to
    // the second and written once, so a write that fails is tried again before giving up.
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await wait(this.#retryDelayMs * 4 ** (attempt - 1));
      }

      try {
        let response = await this.#client.fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType, 'x-amz-acl': 'public-read' },
          body: text,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (response.ok) {
          await response.body?.cancel();

          return;
        }

        let detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 200);

        failure = new Error(`Archive upload failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`);

        // Wrong credentials or a missing bucket will not get better by asking again.
        if (response.status < 500 && response.status !== 429 && response.status !== 408) {
          break;
        }
      } catch (error) {
        failure = new Error(`Archive upload failed: ${error?.message ?? error}`, { cause: error });
      }
    }

    throw failure;
  }

  #unsupported() {
    throw new Error('The archive bucket is write-only here');
  }

  exists() { this.#unsupported(); }
  lastModified() { this.#unsupported(); }
  readJson() { this.#unsupported(); }
  readBytes() { this.#unsupported(); }
  writeBytes() { this.#unsupported(); }
  delete() { this.#unsupported(); }
}
