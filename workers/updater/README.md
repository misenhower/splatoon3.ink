# splatoon3.ink updater Worker

Runs the shared backend code in `app/` (updaters, social posters) on Cloudflare. The local
Node runner (`npm run splatnet`, `npm run social`, …) uses the same code with `dist/` and
`storage/`; this Worker uses R2 instead (see `src/runtime.mjs`).

## How it runs

- **Fast lane** (`Scheduler` Durable Object named `fast`): schedules, gear, co-op, festivals
  (including results), and stages, then social posts. Same cadence as the old Node cron:
  quick runs at :00–:04, full runs at :05, :10, :15, :20, :30, :45 (15 seconds past the
  minute). Quick runs skip translations (`translations: false`), the run's only option. Failed
  runs retry after a minute, up to three times, never past the next slot.
- **Slow lane** (`Scheduler` named `slow`): X-Rank (one request at a time to save memory),
  Splatfest rankings, and seasonal avatar updates, hourly at :20:45. It has no run options.
  Retries after five minutes, up to twice.
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
2. Routing: images are served from each bucket's custom domain (`assets.splatoon3.ink`,
   `dev-assets.splatoon3.ink`). Cloud Connector rules send `/data` and `/status-screenshots`
   on the site hostname to its bucket (production: "Data Assets" for `splatoon3.ink`; dev:
   "Dev Data Assets" for `dev.splatoon3.ink`), or the fast lane's published-data check fails.
3. Secrets (`npx wrangler secret put NAME --config workers/updater/wrangler.jsonc --env dev`):
   `NINTENDO_TOKEN_US`, `NINTENDO_TOKEN_EU`, `NINTENDO_TOKEN_JP`, `NINTENDO_TOKEN_AP`,
   `NXAPI_CLIENT_ID`, `NXAPI_SHARED_SECRET`, `USER_AGENT`, `RUN_TOKEN`, `ACCESS_TEAM_DOMAIN`
   and `ACCESS_AUD` (see Admin panel), `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (see
   Archive), optional `SENTRY_DSN` and
   `CLOUDFLARE_CACHE_PURGE_ZONE_ID` / `CLOUDFLARE_CACHE_PURGE_API_TOKEN`. Social account
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
curl -X POST -H "$AUTH" "$BASE/run?lane=fast"                                   # queue a run (202)
curl -X POST -H "$AUTH" "$BASE/run?lane=fast&translations=false&social=false"   # quick, data only
curl -X POST -H "$AUTH" "$BASE/run?lane=slow"
curl -X POST -H "$AUTH" "$BASE/schedule?lane=all&enabled=true"                  # automatic scheduling
curl -X POST -H "$AUTH" "$BASE/pause?lane=all"                                  # maintenance stop
curl -X POST -H "$AUTH" "$BASE/resume?lane=all"
curl -X POST -H "$AUTH" "$BASE/auth/refresh?region=US"                          # renew credentials now
curl -X POST -H "$AUTH" "$BASE/arm"                                             # what the cron does
```

Manual runs are queued and executed by the lane's alarm; poll `/status` for the result.
A manual run interrupted mid-way is reported as failed rather than replayed, so social posts
are never repeated automatically.

## Archive

With `ARCHIVE_DATA` set, every data file an updater publishes is also written to the archive
bucket on DigitalOcean Spaces, at the same keys the Node runner uploads to
(`YYYY/MM/DD/<date>.<time>.<name>.json`, publicly readable). The Worker has no disk, so the
snapshot goes straight to Spaces as part of the update (`app/common/storage/S3ArchiveStorage.mjs`).

- Settings: the vars `ARCHIVE_DATA`, `AWS_S3_ENDPOINT`, `AWS_REGION` and `AWS_S3_ARCHIVE_BUCKET`
  in `wrangler.jsonc`, and a Spaces key that can write to that bucket as the secrets
  `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- Dev writes to its own Space (`splatoon3ink-archive-test`). Environments write the same keys,
  so they must never share a bucket.
- The fast lane holds its snapshots until after social posts (even failed ones), then uploads
  the newest copy of each, so a slow archive bucket never delays a post. The slow lane uploads
  as it goes, to avoid holding large X-Rank files in memory.
- A snapshot that cannot be written is a warning in the run's log (and a Sentry event), never
  a failed update. Each write is tried three times. Most snapshots are named for the hour and
  written again by every run in it, so a short Spaces outage costs nothing; X-Rank snapshots
  are stamped to the second and written once, so one that fails all three tries is lost.
- Production has no archive settings yet; add them before cutover.

## Admin panel

A Vue app (`admin/`) served by this Worker on its own hostname (`admin.dev.splatoon3.ink`,
`admin.splatoon3.ink`), behind a Cloudflare Access application. The Worker checks the Access
token itself on every request, so nothing is served without it, and the panel is not reachable
on any other hostname.

- **Timeline**: runs of both lanes, credential renewals and social posts on a time axis that
  scrolls back through the last 48 hours, and the same things as a list (with what is coming
  up next). The two scroll together. Selecting anything in either shows its details and log
  lines. A combined log sits below.
- **Controls**: per lane, run now, pause, and automatic scheduling; credential renewal per
  region.
- **Social**: the post log (what was posted, what failed), a posting switch per account, when
  each status last went to each account, and a preview of any status with a confirmed post by
  hand. A manual run from the panel never posts unless "Post to social" is ticked.
- **Data**: the published data files with their age, a check that the site serves them, and a
  cache purge.

Setup, once per environment:

1. Create a Cloudflare Access self-hosted application for the whole admin hostname, allowing
   only the owner.
2. Set the secrets `ACCESS_TEAM_DOMAIN` (`<team>.cloudflareaccess.com`) and `ACCESS_AUD` (the
   application's audience tag). Without both, every admin request is refused.
3. Deploy. The deploy scripts build the app first (`npm run admin:build`), and the first
   deploy attaches the admin hostname as a Worker custom domain.

```sh
npm run admin:dev     # the panel with a simulated API on http://localhost:5180 (no Worker)
npm run admin:build   # build to admin/dist, which the Worker serves
```

What the panel stores:

- Each lane's `Scheduler` keeps its runs and their log lines for 48 hours (`HISTORY_MS` in
  `src/schedule.mjs`).
- Social posts and failures are kept in the fast lane's `Scheduler` (the last 300).
- Each `RegionAuth` keeps its renewals and their log lines for the same 48 hours.
- Account posting switches are in private storage at `settings/social.json`; the Node runner
  honours them too.

## Not yet

- Daily archive compression: rolling each day's snapshots into a `tar.zst` needs the `zstd`
  binary and local disk, so it will run in a container. Until then the Node command
  (`npm run data:archive:compress`) does it from anywhere with access to the bucket.
