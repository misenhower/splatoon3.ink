# splatoon3.ink updater Worker

Runs the shared backend code in `app/` (updaters, social posters) on Cloudflare. The local
Node runner (`npm run splatnet`, `npm run social`, …) uses the same code with `dist/` and
`storage/`; this Worker uses R2 instead (see `src/runtime.mjs`).

## How it runs

- **Fast lane** (`Scheduler` Durable Object named `fast`): schedules, gear, co-op, festivals
  (including results), and stages, then social posts. Same cadence as the old Node cron:
  quick updates at :00–:04, default updates at :05, :10, :15, :20, :30, :45 (15 seconds past
  the minute). Failed runs retry after a minute, up to three times, never past the next slot.
- **Slow lane** (`Scheduler` named `slow`): X-Rank (one request at a time to save memory),
  Splatfest rankings, and seasonal avatar updates, hourly at :20:45. Retries after five minutes,
  up to twice.
- **RegionAuth** (one Durable Object per region, `US`/`EU`/`JP`/`AP`): the only place that logs
  in to Nintendo for its region. Both lanes get bullet tokens from it, so they share one token
  and never log in at the same time. It renews credentials hourly at :35–:38.
- A cron trigger every five minutes only re-arms missing alarms. It never enables a lane.

Each lane runs one thing at a time; the lanes run independently of each other. Run limits
(concurrent SplatNet requests, image downloads) are created per run, never shared between
Durable Objects (see `app/data/RunLimits.mjs`).

Before social posts, the fast lane checks that `SITE_URL` serves the data it just published
(screenshots render the public site). A mismatch fails the run so it retries a minute later.
With `CLOUDFLARE_CACHE_PURGE_*` configured, data JSON is purged from the edge after writes.

## Setup (once per environment)

1. R2 buckets: dev uses `splatoon3-ink-dev-assets` and `splatoon3-ink-dev-private`;
   production uses `splatoon3-ink-assets` and `splatoon3-ink-private` (create the private
   bucket before the first production deploy; never make it public).
2. Dev routing: `dev.splatoon3.ink` must serve `/data/` and `/splatnet/` from the dev bucket
   (Cloud Connector rule), or the fast lane's published-data check fails.
3. Secrets (`npx wrangler secret put NAME --config workers/updater/wrangler.jsonc --env dev`):
   `NINTENDO_TOKEN_US`, `NINTENDO_TOKEN_EU`, `NINTENDO_TOKEN_JP`, `NINTENDO_TOKEN_AP`,
   `NXAPI_CLIENT_ID`, `NXAPI_SHARED_SECRET`, `USER_AGENT`, `RUN_TOKEN`, optional `SENTRY_DSN`
   and `CLOUDFLARE_CACHE_PURGE_ZONE_ID` / `CLOUDFLARE_CACHE_PURGE_API_TOKEN`. Social account
   credentials go on production only (leave them unset in dev).
4. Deploy, check status, run once by hand, then turn on automatic scheduling.

New schedulers start with automatic scheduling off; the setting is stored in the Durable
Object and survives deployments.

## Commands

```sh
npm run updater:test              # Worker tests in workerd (also part of npm test)
npm run updater:deploy:dry-run    # bundle the dev Worker without deploying
npm run updater:deploy            # deploy dev
npm run updater:deploy:production # deploy production
npm run updater:tail              # stream dev logs
```

## Control endpoints

All require `Authorization: Bearer $RUN_TOKEN` (they are disabled without `RUN_TOKEN`).

```sh
BASE=https://splatoon3-ink-dev-updater.<subdomain>.workers.dev
AUTH="Authorization: Bearer $RUN_TOKEN"

curl -H "$AUTH" "$BASE/status"
curl -X POST -H "$AUTH" "$BASE/run?lane=fast&mode=default"              # queue a run (202)
curl -X POST -H "$AUTH" "$BASE/run?lane=fast&mode=quick&social=false"   # data only
curl -X POST -H "$AUTH" "$BASE/run?lane=slow&mode=all"
curl -X POST -H "$AUTH" "$BASE/schedule?lane=all&enabled=true"          # automatic scheduling
curl -X POST -H "$AUTH" "$BASE/pause?lane=all"                          # maintenance stop
curl -X POST -H "$AUTH" "$BASE/resume?lane=all"
curl -X POST -H "$AUTH" "$BASE/auth/refresh?region=US"                  # renew credentials now
curl -X POST -H "$AUTH" "$BASE/arm"                                     # what the cron does
```

Manual runs are queued and executed by the lane's alarm; poll `/status` for the result.
A manual run interrupted mid-way is reported as failed rather than replayed, so social posts
are never repeated automatically.

## Not yet

- Archives (`ARCHIVE_DATA`): the Worker has no archive storage yet; snapshots to Spaces and the
  daily compression container are the next step.
- Admin panel: the endpoints above are the whole interface for now.
