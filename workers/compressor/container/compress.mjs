// Container entry point: compress finished days in the archive Space into daily tar.zst files,
// then exit. The Compressor Durable Object starts it and reads the exit code.
//
// Environment: AWS_S3_ENDPOINT, AWS_REGION, AWS_S3_ARCHIVE_BUCKET, AWS_ACCESS_KEY_ID and
// AWS_SECRET_ACCESS_KEY (see ArchiveCompressor), MAX_DAYS, DRY_RUN, and LOG_PORT (where the
// Durable Object fetches what this prints). A failure is reported to Sentry by the Durable
// Object, from the exit code.

import { compressArchives } from '../../../app/data/ArchiveCompressor.mjs';
import { serveLogs } from './logServer.mjs';

let logs = serveLogs(process.env.LOG_PORT);

let maxDays = Number(process.env.MAX_DAYS || 10);
let dryRun = process.env.DRY_RUN === 'true';

try {
  // The compressor logs its own errors.
  await compressArchives(maxDays, dryRun);
} catch {
  process.exitCode = 1;
} finally {
  await logs.close(process.exitCode ?? 0);
}
