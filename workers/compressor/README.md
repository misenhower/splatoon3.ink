# splatoon3.ink archive compressor Worker

Once a day, bundles each finished day of data snapshots in the archive Space (DigitalOcean
Spaces) into `YYYY/MM/YYYY-MM-DD.tar.zst` plus a `.manifest.json`, using the same code as
`npm run data:archive:compress` (`app/data/ArchiveCompressor.mjs`). The updater Worker writes
the snapshots; this Worker never touches R2.

## How it runs

- A cron trigger at 00:30 UTC asks the `Compressor` Durable Object (named `archive`) to start
  a run. Days still being written (today, or anything changed in the last 30 minutes) are
  skipped, and a run compresses at most 10 days.
- The work happens in a Cloudflare Container (`Dockerfile`, entry point
  `container/compress.mjs`) because it needs `tar` and `zstd`. It runs on `standard-1`
  (½ vCPU, 4 GiB, 8 GB disk); a production day (~430 MB of snapshots) takes under a minute.
- What the container prints (the `[Archive Compressor]` lines) goes to stdout, which is in
  Workers Logs (not `wrangler tail`). The container also serves it on port 8080
  (`container/logServer.mjs`), and once the work is done, its exit code too.
- While a run goes on, an alarm every three seconds fetches the new lines (up to 500 are kept
  with each run) and checks on the container. The run ends when the container reports its exit
  code; the container waits (up to two minutes) until that report has been fetched, then
  exits. The object keeps the last 30 runs (exit code, error, timing, log), and only one run
  happens at a time.
- Nothing depends on the Durable Object staying in memory: Cloudflare can evict it mid-run (it
  did, before the alarm took over), and the next alarm carries on from what is stored.
- A container that stops without reporting (a crash, running out of memory) fails the run
  with "The container stopped before it reported how the run went"; its log shows how far it
  got. A run past three hours is stopped.
- The updater's admin panel shows the runs (timeline and Controls) and can start one, through
  its `COMPRESSOR` binding to this Worker's Durable Object.

The compressor doesn't delete the source snapshots; `npm run data:archive:prune` does that,
by hand.

## Setup (once per environment)

1. Docker or a Docker-compatible CLI (OrbStack) must be running: `wrangler deploy` builds the
   image from the repository root and pushes it to Cloudflare's registry.
2. Secrets (`npx wrangler secret put NAME --config workers/compressor/wrangler.jsonc --env dev`):
   `RUN_TOKEN`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (a Spaces key for the archive
   bucket), optional `SENTRY_DSN` (the Durable Object reports each failed run to Sentry; the
   container itself does not).
3. The bucket is a var: dev uses `splatoon3ink-archive-test` and must never point at the
   production `splatoon3ink-archive`.
4. Production: deploy only once spectre stops, which also compresses at 00:30 UTC.

## Commands

```sh
npm run compressor:deploy:dry-run    # build the image and bundle the dev Worker
npm run compressor:deploy            # deploy dev
npm run compressor:deploy:production # deploy production
npm run compressor:tail              # stream dev Worker logs (not the container's output)
```

With `RUN_TOKEN` in `workers/compressor/.dev.vars`:

```sh
AUTH="Authorization: Bearer $RUN_TOKEN"
BASE=https://splatoon3-ink-dev-compressor.ike.workers.dev
curl -H "$AUTH" "$BASE/status"                        # the run in progress and recent runs
curl -H "$AUTH" "$BASE/run?id=RUN_ID"                 # one run with its log lines
curl -X POST -H "$AUTH" "$BASE/run"                   # compress now (202, or 409 if running)
curl -X POST -H "$AUTH" "$BASE/run?dryRun=true"       # list what would be compressed
curl -X POST -H "$AUTH" "$BASE/run?maxDays=30"        # catch up on more days
```

To try the image locally (OrbStack), against dev's bucket only:

```sh
docker build --platform linux/amd64 -f workers/compressor/Dockerfile -t splatoon3ink-compressor .
docker run --rm --platform linux/amd64 -e AWS_S3_ENDPOINT -e AWS_REGION -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY -e AWS_S3_ARCHIVE_BUCKET=splatoon3ink-archive-test -e DRY_RUN=true \
  splatoon3ink-compressor
```
