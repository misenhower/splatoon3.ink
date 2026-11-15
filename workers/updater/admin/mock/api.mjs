// A simulated admin API for `npm run admin:dev`. It follows the real schedule and answers in
// the same shapes as workers/updater/src/admin/routes.mjs, with invented results. Nothing here
// talks to a Worker, Nintendo, or a social network.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const HISTORY_MS = 48 * HOUR;
const REGIONS = ['US', 'EU', 'JP', 'AP'];

const QUICK = { translations: false };
const FULL = { translations: true };

const SCHEDULES = {
  fast: {
    second: 15,
    slots: [
      [0, QUICK], [1, QUICK], [2, QUICK], [3, QUICK], [4, QUICK],
      [5, FULL], [10, FULL], [15, FULL], [20, FULL], [30, FULL], [45, FULL],
    ],
  },
  slow: { second: 45, slots: [[20, {}]] },
};

const FAST_UPDATERS = ['Schedules', 'Gear', 'Co-op', 'Festival US', 'Festival EU', 'Festival JP', 'Festival AP', 'Stages'];
const SLOW_UPDATERS = ['XRank Tentatek', 'XRank Takoroka', 'FestivalRankings US', 'FestivalRankings EU', 'FestivalRankings JP', 'FestivalRankings AP'];

const ACCOUNTS = [
  { key: 'twitter', name: 'Twitter (Buffer)', locale: 'en-US' },
  { key: 'mastodon', name: 'Mastodon', locale: 'en-US' },
  { key: 'bluesky', name: 'Bluesky', locale: 'en-US' },
  { key: 'threads', name: 'Threads', locale: 'en-US' },
  { key: 'twitter.jp', name: 'Twitter (Buffer, JP)', locale: 'ja-JP' },
  { key: 'bluesky.jp', name: 'Bluesky (JP)', locale: 'ja-JP' },
];

const GENERATORS = [
  { key: 'schedules', name: 'Schedules' },
  { key: 'gear.dailydrop', name: 'Daily Drop Gear' },
  { key: 'gear.regular', name: 'Regular Gear' },
  { key: 'challenge', name: 'Challenge' },
  { key: 'salmonrun', name: 'Salmon Run' },
  { key: 'salmonrun.upcoming', name: 'Upcoming Salmon Run' },
  { key: 'splatfest.NA', name: 'Splatfest (NA)' },
  { key: 'splatfest.EU', name: 'Splatfest (EU)' },
  { key: 'splatfest.JP', name: 'Splatfest (JP)' },
  { key: 'splatfest.AP', name: 'Splatfest (AP)' },
  { key: 'splatfestResults.NA', name: 'Splatfest Results (NA)' },
  { key: 'splatfestResults.EU', name: 'Splatfest Results (EU)' },
  { key: 'splatfestResults.JP', name: 'Splatfest Results (JP)' },
  { key: 'splatfestResults.AP', name: 'Splatfest Results (AP)' },
  { key: 'eggstrawork', name: 'Eggstra Work' },
  { key: 'eggstrawork.upcoming', name: 'Upcoming Eggstra Work' },
];

// How often each simulated status goes out, in hours, and how far into the hour.
const POSTING = {
  'schedules': { every: 2, offset: 0 },
  'gear.regular': { every: 4, offset: 0 },
  'gear.dailydrop': { every: 24, offset: 0 },
  'salmonrun': { every: 40, offset: 16 },
  'salmonrun.upcoming': { every: 40, offset: 15 },
  'challenge': { every: 72, offset: 4 },
};

function previewImage(name, locale) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="#22222d"/>
    <rect x="24" y="24" width="752" height="402" rx="16" fill="none" stroke="#55556a" stroke-dasharray="8 8"/>
    <text x="400" y="215" fill="#f2f2f7" font-family="sans-serif" font-size="30" text-anchor="middle">${name}</text>
    <text x="400" y="255" fill="#a3a3b5" font-family="sans-serif" font-size="18" text-anchor="middle">Simulated screenshot (${locale})</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// A stable pseudo-random number in [0, 1) for a seed, so reloads show the same history.
function random(seed) {
  let x = Math.sin(seed / 1000) * 10000;

  return x - Math.floor(x);
}

function slotsBefore(schedule, now, count) {
  let slots = [];

  for (let hour = now - (now % HOUR); slots.length < count; hour -= HOUR) {
    for (let [minute, options] of [...schedule.slots].reverse()) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at <= now && slots.length < count) {
        slots.push({ at, options });
      }
    }
  }

  return slots;
}

// A schedule's slots in [from, to), oldest first.
function slotsIn(schedule, from, to) {
  let slots = [];

  for (let hour = from - (from % HOUR); hour < to; hour += HOUR) {
    for (let [minute, options] of schedule.slots) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at >= from && at < to) {
        slots.push({ at, options });
      }
    }
  }

  return slots;
}

function nextSlot(schedule, now) {
  for (let hour = now - (now % HOUR); ; hour += HOUR) {
    for (let [minute, options] of schedule.slots) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at > now) return { at, options };
    }
  }
}

function results(names, startedAt, failing = null) {
  return names.map((name, index) => {
    let ms = Math.round(400 + random(startedAt + index * 77) * 2400);

    return name === failing
      ? { name, ok: false, ms, error: 'SplatNet returned HTTP 503' }
      : { name, ok: true, ms };
  });
}

function logsFor(run, lane) {
  let lines = [];
  let at = run.startedAt;
  let add = (level, text, step = 400) => {
    at += step;
    lines.push({ at: Math.min(at, run.finishedAt ?? at), level, text });
  };

  add('info', `Running ${lane} updaters...`, 20);

  for (let result of run.updaters?.results ?? []) {
    add('info', `[${result.name}] Updating...`, 120);

    if (!result.ok) {
      add('error', `[${result.name}] ${result.error}`, result.ms);
    } else if (random(run.startedAt + result.ms) > 0.6) {
      add('debug', `[${result.name}] Data is unchanged`, result.ms);
    }
  }

  add('info', `Done running ${lane} updaters`);

  if (run.posted) {
    add('info', '[Social] [Schedules] Generating status...');
    add('info', '[Social] [Schedules] [Mastodon] Posting...', 9000);
    add('info', '[Social] [Schedules] [Bluesky] Posting...', 300);
  } else if (lane === 'fast' && run.social) {
    add('info', '[Social] [Schedules] No status to post, skipping');
  }

  if (run.error) {
    add('error', `Run failed: ${run.error}`);
  }

  return { lines, omitted: 0 };
}

function fastRun(slot, now, { trigger = 'scheduled', failing = null } = {}) {
  let driftMs = Math.round(200 + random(slot.at) * 700);
  let startedAt = slot.at + driftMs;
  let topOfHour = slot.at % HOUR < MINUTE && Math.floor(slot.at / HOUR) % 2 === 0;
  let updaters = results(FAST_UPDATERS, startedAt, failing);
  let duration = Math.max(...updaters.map(result => result.ms)) + 600 + (topOfHour ? 38_000 : 0);
  let failed = updaters.filter(result => !result.ok);

  return {
    id: `fast-${slot.at}-${trigger}`,
    ok: failed.length === 0,
    trigger,
    ...slot.options,
    social: true,
    posted: topOfHour,
    startedAt,
    finishedAt: Math.min(startedAt + duration, now),
    scheduledFor: slot.at,
    driftMs,
    purged: true,
    updaters: { ok: failed.length === 0, failed, results: updaters },
  };
}

function slowRun(slot, now) {
  let driftMs = Math.round(300 + random(slot.at) * 600);
  let startedAt = slot.at + driftMs;
  let updaters = results(SLOW_UPDATERS, startedAt).map(result => ({ ...result, ms: result.ms * 40 }));
  let duration = updaters.reduce((total, result) => total + result.ms, 0);

  return {
    id: `slow-${slot.at}`,
    ok: true,
    incomplete: false,
    trigger: 'scheduled',
    ...slot.options,
    social: true,
    startedAt,
    finishedAt: startedAt + duration,
    duration,
    scheduledFor: slot.at,
    driftMs,
    purged: true,
    updaters: { ok: true, failed: [], results: updaters },
  };
}

function summarize(run) {
  let summary = { ...run };

  delete summary.duration;

  return summary;
}

export function createMockApi() {
  let lanes = {
    fast: { enabled: true, manual: null, extra: [] },
    slow: { enabled: true, manual: null, extra: [] },
  };
  let refreshed = {};
  // The switches for scheduled credential renewals (every region) and the daily compression.
  let authScheduled = true;
  let archiveScheduled = true;
  let disabled = { threads: { at: Date.now() - 26 * HOUR } };
  let manualPosts = [];
  // Archive compressions started from the panel; each takes 40 seconds.
  let compressions = [];

  // Posts follow the rotation clock. One delivery failed, to show what that looks like.
  function posts(now) {
    let events = [];

    for (let [key, { every, offset }] of Object.entries(POSTING)) {
      let generator = GENERATORS.find(candidate => candidate.key === key);
      let period = every * HOUR;

      for (let at = Math.floor((now - offset * HOUR) / period) * period + offset * HOUR, count = 0; at > now - HISTORY_MS - period && count < 30; at -= period, count++) {
        ACCOUNTS.forEach((account, index) => {
          let posted = at + 38_000 + index * 900;

          if (posted > now) return;
          if (disabled[account.key] && posted > disabled[account.key].at) return;

          let failed = key === 'gear.regular' && account.key === 'bluesky' && count === 0;

          events.push({
            id: `${key}-${account.key}-${at}`,
            at: posted,
            type: failed ? 'error' : 'posted',
            generator,
            client: { key: account.key, name: account.name },
            locale: account.locale,
            runId: `fast-${at + 15_000}-scheduled`,
            ...(failed && { error: 'Upload failed: HTTP 502 from bsky.social' }),
          });
        });
      }
    }

    return [...events, ...manualPosts].sort((a, b) => b.at - a.at);
  }

  // Published files, written when the lane that owns them last ran. Co-op is left behind to
  // show a stale file.
  function data(now) {
    let fast = slotsBefore(SCHEDULES.fast, now, 1)[0].at + 4000;
    let detailed = slotsBefore({ second: 15, slots: SCHEDULES.fast.slots.filter(slot => slot[1] === 'default') }, now, 1)[0].at + 6000;
    let slow = slotsBefore(SCHEDULES.slow, now, 2)[1].at + 5 * MINUTE;
    let files = [
      { key: 'data/schedules.json', size: 148_220, uploaded: fast },
      { key: 'data/gear.json', size: 21_480, uploaded: fast },
      { key: 'data/coop.json', size: 9_310, uploaded: fast - 47 * MINUTE },
      { key: 'data/festivals.json', size: 302_115, uploaded: fast },
      { key: 'data/stages.json', size: 18_904, uploaded: fast },
    ];

    for (let region of REGIONS) {
      files.push({ key: `data/currentfest.${region}.json`, size: 2_210, uploaded: fast });
      files.push({ key: `data/festivals.${region}.ics`, size: 41_870, uploaded: fast });
      files.push({ key: `data/festivals.ranking.${region}.JUEA-00019.json`, size: 96_400, uploaded: now - 40 * 24 * HOUR });
      files.push({ key: `data/festivals.ranking.${region}.JUEA-00018.json`, size: 95_120, uploaded: now - 130 * 24 * HOUR });
    }

    for (let locale of ['de-DE', 'en-GB', 'en-US', 'es-ES', 'es-MX', 'fr-CA', 'fr-FR', 'it-IT', 'ja-JP', 'ko-KR', 'nl-NL', 'ru-RU', 'zh-CN', 'zh-TW']) {
      files.push({ key: `data/locale/${locale}.json`, size: 88_000 + locale.charCodeAt(0) * 40, uploaded: detailed });
    }

    for (let division of ['tentatek', 'takoroka']) {
      files.push({ key: `data/xrank/xrank.${division}.json`, size: 6_120, uploaded: slow });
    }

    for (let rule of ['splatzones', 'towercontrol', 'rainmaker', 'clamblitz']) {
      files.push({ key: `data/xrank/xrank.detail.p-17.${rule}.json`, size: 1_240_000, uploaded: slow });
      files.push({ key: `data/xrank/xrank.detail.p-17.${rule}.weapons.json`, size: 310_000, uploaded: slow });
    }

    return { now, siteUrl: 'https://dev.splatoon3.ink', purgeConfigured: true, files };
  }

  function social(now) {
    let log = posts(now);
    let lastPosted = {};

    for (let event of [...log].reverse()) {
      if (event.type === 'posted' && event.client) {
        (lastPosted[event.client.key] ??= {})[event.generator.key] = { postedAt: event.at };
      }
    }

    return {
      accounts: ACCOUNTS.map(account => ({
        ...account,
        configured: true,
        enabled: !disabled[account.key],
        disabledAt: disabled[account.key]?.at ?? null,
      })),
      generators: GENERATORS,
      lastPosted,
      posts: log.slice(0, 300),
    };
  }

  // Runs that started in [from, to), newest first, without their log lines.
  function history(lane, now, from = now - HISTORY_MS, to = now + MINUTE) {
    let runs = [];

    from = Math.max(from, now - HISTORY_MS);
    to = Math.min(to, now + 1);

    if (lane === 'fast') {
      // One failure about an hour ago, and the odd one further back.
      let recent = slotsBefore(SCHEDULES.fast, now, 48).find(slot => now - slot.at > 50 * MINUTE && slot.options.translations);

      for (let slot of slotsIn(SCHEDULES.fast, from - 2 * MINUTE, to)) {
        let failing = slot.at === recent.at ? 'Co-op' : random(slot.at + 5) > 0.99 ? 'Gear' : null;

        runs.push(fastRun(slot, now, { failing }));
      }
    } else {
      for (let slot of slotsIn(SCHEDULES.slow, from - HOUR, to)) {
        let run = slowRun(slot, now);

        // The newest one may still be going; current() reports it instead.
        if (run.finishedAt <= now) runs.push(run);
      }
    }

    runs.push(...lanes[lane].extra);

    return runs
      .filter(run => run.startedAt >= from && run.startedAt < to)
      .map(run => ({ ...run, logLines: logsFor(run, lane).lines.length, postCount: run.posted ? ACCOUNTS.length : 0 }))
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  function current(lane, now) {
    let manual = lanes[lane].manual;

    if (manual && now >= manual.startAt) {
      let { translations, social } = manual.run;

      return { startedAt: manual.startAt, translations, social, trigger: 'manual' };
    }

    if (lane === 'slow' && lanes.slow.enabled) {
      let [slot] = slotsBefore(SCHEDULES.slow, now, 1);
      let run = slowRun(slot, now);

      if (run.finishedAt > now) {
        return { startedAt: run.startedAt, social: true, trigger: 'scheduled' };
      }
    }

    return null;
  }

  function currentLogs(lane, now) {
    let running = current(lane, now);

    if (!running) return null;

    let names = lane === 'fast' ? FAST_UPDATERS : SLOW_UPDATERS;
    let lines = [{ at: running.startedAt + 20, level: 'info', text: `Running ${lane} updaters...` }];
    let elapsed = now - running.startedAt;
    let step = lane === 'fast' ? 900 : 60_000;

    names.slice(0, Math.floor(elapsed / step) + 1).forEach((name, index) => {
      lines.push({ at: running.startedAt + 140 + index * step, level: 'info', text: `[${name}] Updating...` });
    });

    return { lines, omitted: 0 };
  }

  // Finish a simulated manual run once its time is up.
  function settle(now) {
    for (let [lane, state] of Object.entries(lanes)) {
      let manual = state.manual;

      if (manual && now >= manual.endAt) {
        let names = lane === 'fast' ? FAST_UPDATERS : SLOW_UPDATERS;
        let updaters = results(names, manual.startAt);

        state.extra.push({
          ...manual.run,
          ok: true,
          trigger: 'manual',
          status: 'done',
          startedAt: manual.startAt,
          finishedAt: manual.endAt,
          purged: true,
          updaters: { ok: true, failed: [], results: updaters },
        });
        state.manual = null;
      }
    }
  }

  function laneStatus(lane, now) {
    let state = lanes[lane];
    let runs = history(lane, now, now - 3 * HOUR).slice(0, 20);
    let running = current(lane, now);
    let manual = state.manual;

    return {
      lane,
      enabled: state.enabled,
      next: state.enabled ? nextSlot(SCHEDULES[lane], now) : null,
      lastRun: runs[0] ? summarize(runs[0]) : null,
      pending: manual ? { ...manual.run, status: now >= manual.startAt ? 'running' : 'queued' } : null,
      running: !!running,
      current: running && { ...running, logLines: currentLogs(lane, now).lines.length },
      alarmAt: !state.enabled ? null : nextSlot(SCHEDULES[lane], now).at,
      history: runs.map(summarize),
    };
  }

  // Renewals that started in [from, to), newest first.
  function authEvents(region, now, from = now - HISTORY_MS, to = now + MINUTE) {
    let offset = (35 + REGIONS.indexOf(region)) * MINUTE;
    let events = [];
    let latest = now - ((now - offset) % HOUR);

    from = Math.max(from, now - HISTORY_MS);

    for (let at = latest, count = 0; at >= from; at -= HOUR, count++) {
      // The AP region trips once, two renewals ago, to show what a failure looks like. US
      // recovers from a step that failed (znca briefly unavailable), which is only a warning.
      let failed = region === 'AP' && count === 1;
      let recovered = region === 'US' && count === 2;

      events.push({
        at,
        finishedAt: at + 2200 + Math.round(random(at) * 1500) + (recovered ? 30_000 : 0),
        ok: !failed,
        trigger: 'scheduled',
        errors: failed ? ['Invalid bullet token response code: 502'] : [],
        warnings: recovered ? ['[znca-api] f: 503 Service Unavailable'] : [],
      });
    }

    if (refreshed[region]) {
      events.push({ at: refreshed[region], finishedAt: refreshed[region] + 2400, ok: true, trigger: 'manual', errors: [], warnings: [] });
    }

    return events.filter(event => event.at >= from && event.at < to).sort((a, b) => b.at - a.at);
  }

  function authLogs(region, event) {
    let lines = [
      { at: event.at + 30, level: 'info', text: `[NSO] [${region}] Renewing credentials...` },
      ...event.warnings.map(text => ({ at: event.at + 600, level: 'error', text })),
      { at: event.at + 900, level: 'debug', text: `[NSO] [${region}] Got a web service token` },
    ];

    lines.push(event.ok
      ? { at: event.finishedAt - 20, level: 'info', text: `[NSO] [${region}] Got a bullet token` }
      : { at: event.finishedAt - 20, level: 'error', text: event.errors[0] });

    return { lines, omitted: 0 };
  }

  function authStatus(region, now) {
    let offset = (35 + REGIONS.indexOf(region)) * MINUTE;
    let events = authEvents(region, now, now - 8 * HOUR).slice(0, 8);
    let hour = now - (now % HOUR);

    return {
      region,
      alarmAt: !authScheduled ? null : hour + offset > now ? hour + offset : hour + HOUR + offset,
      lastRefreshAt: events[0]?.finishedAt ?? null,
      enabled: authScheduled,
      hasSessionToken: true,
      events,
    };
  }

  // The archive compressor (workers/compressor/): a run every day at 00:30 UTC for the last
  // month, one failed and one that stopped without reporting, plus any started from the panel.
  function archiveStatus(now) {
    let next = new Date(now);
    next.setUTCHours(0, 30, 0, 0);
    if (next.getTime() <= now) next.setUTCDate(next.getUTCDate() + 1);
    let nextAt = next.getTime();

    let runs = [];

    for (let day = 1; day <= 30; day++) {
      let startedAt = nextAt - day * 24 * HOUR;
      let failed = day === 4;

      if (day === 2) {
        runs.push({
          id: `daily-${startedAt}`, trigger: 'scheduled', maxDays: 10, dryRun: false, startedAt,
          finishedAt: startedAt + 5 * 60_000, ok: false, lost: true, exitCode: null,
          error: 'The container stopped before it reported how the run went',
        });
        continue;
      }

      runs.push({
        id: `daily-${startedAt}`,
        trigger: 'scheduled',
        maxDays: 10,
        dryRun: false,
        startedAt,
        finishedAt: startedAt + (failed ? 6000 : 35_000 + Math.round(random(startedAt) * 15_000)),
        ok: !failed,
        exitCode: failed ? 1 : 0,
        ...(failed ? { error: 'The compressor exited with code 1' } : {}),
      });
    }

    let current = null;

    for (let run of compressions) {
      if (now - run.startedAt < 40_000) {
        current = run;
      } else {
        runs.push({ ...run, finishedAt: run.startedAt + 40_000, ok: true, exitCode: 0 });
      }
    }

    return {
      now,
      enabled: archiveScheduled,
      nextAt: archiveScheduled ? nextAt : null,
      current,
      runs: runs.sort((a, b) => b.startedAt - a.startedAt),
    };
  }

  // What a compression printed: the [Archive Compressor] lines, as far as it has got by now.
  function archiveLogs(run, now) {
    let say = (offset, text, level = 'info') => ({ at: run.startedAt + offset, level, text: `[Archive Compressor] ${text}` });
    let days = run.dryRun || run.trigger === 'manual' ? 0 : 1;
    let date = new Date(run.startedAt - 24 * HOUR).toISOString().slice(0, 10);
    let key = `${date.slice(0, 4)}/${date.slice(5, 7)}/${date}`;
    let lines = [say(1200, `Found ${days} dates to archive`)];

    if (days) {
      lines.push(
        say(1900, `Would create ${key}.tar.zst and ${key}.tar.zst.manifest.json from 552 files`),
        say(2000, `Creating ${key}.tar.zst`),
      );
    }

    if (run.error && !run.lost) {
      lines.push(say(6000, 'Archive compressor failed', 'error'), say(6010, 'Tar archive is missing files from its manifest', 'error'));
    } else if (!run.lost) {
      lines.push(say(Math.max(2500, (run.finishedAt ?? run.startedAt + 40_000) - run.startedAt - 500),
        run.dryRun ? `Would compress ${days} daily archives` : `Compressed ${days} daily archives`));
    }

    return { lines: lines.filter(line => line.at <= now), omitted: 0 };
  }

  function log(now) {
    let lines = [];

    for (let lane of Object.keys(lanes)) {
      let live = currentLogs(lane, now);

      lines.push(...(live?.lines ?? []).map(line => ({ ...line, runId: 'current', source: lane })));

      for (let run of history(lane, now, now - (lane === 'fast' ? 3 : 6) * HOUR)) {
        lines.push(...logsFor(run, lane).lines.map(line => ({ ...line, runId: run.id, source: lane })));
      }
    }

    for (let region of REGIONS) {
      for (let event of authEvents(region, now, now - 6 * HOUR)) {
        lines.push(...authLogs(region, event).lines.map(line => ({ ...line, text: `${region}: ${line.text}`, source: 'auth', region, eventAt: event.at })));
      }
    }

    return lines.sort((a, b) => b.at - a.at).slice(0, 400);
  }

  function handle(method, pathname, query, body) {
    let now = Date.now();

    settle(now);

    if (method === 'GET' && pathname === '/status') {
      return {
        status: 200,
        body: {
          user: { email: 'Local preview' },
          environment: 'preview',
          siteUrl: 'https://dev.splatoon3.ink',
          now,
          schedules: SCHEDULES,
          historyMs: HISTORY_MS,
          lanes: Object.fromEntries(Object.keys(lanes).map(lane => [lane, laneStatus(lane, now)])),
          auth: Object.fromEntries(REGIONS.map(region => [region, authStatus(region, now)])),
          posts: posts(now).slice(0, 40),
          archive: archiveStatus(now),
        },
      };
    }

    if (method === 'GET' && pathname === '/data') {
      return { status: 200, body: data(now) };
    }

    if (method === 'GET' && pathname === '/social') {
      return { status: 200, body: social(now) };
    }

    if (method === 'GET' && pathname === '/log') {
      return { status: 200, body: { lines: log(now) } };
    }

    if (method === 'GET' && pathname === '/activity') {
      let to = Number(query.get('to')) || now + MINUTE;
      let from = Number(query.get('from')) || to - 6 * HOUR;

      if (!(from < to)) return { status: 400, body: { ok: false, error: 'From must be before to.' } };

      return {
        status: 200,
        body: {
          now,
          historyMs: HISTORY_MS,
          from,
          to,
          runs: Object.fromEntries(Object.keys(lanes).map(lane => [lane, history(lane, now, from, to).map(summarize)])),
          auth: Object.fromEntries(REGIONS.map(region => [region, authEvents(region, now, from, to)])),
          posts: posts(now).filter(post => post.at >= from && post.at < to),
          archive: archiveStatus(now).runs.filter(run => run.startedAt >= from && run.startedAt < to),
        },
      };
    }

    if (method === 'GET' && pathname === '/run') {
      let lane = query.get('lane');
      let id = query.get('id');

      if (!lanes[lane]) return { status: 404, body: { ok: false, error: 'Run not found.' } };

      if (id === 'current') {
        let running = current(lane, now);

        return running
          ? { status: 200, body: { lane, run: { ...running, id: 'current', logs: currentLogs(lane, now) } } }
          : { status: 404, body: { ok: false, error: 'Run not found.' } };
      }

      let run = history(lane, now).find(candidate => candidate.id === id);

      return run
        ? { status: 200, body: { lane, run: { ...summarize(run), logs: logsFor(run, lane) } } }
        : { status: 404, body: { ok: false, error: 'Run not found.' } };
    }

    if (method === 'GET' && pathname === '/auth/event') {
      let region = query.get('region');
      let event = REGIONS.includes(region) && authEvents(region, now).find(candidate => candidate.at === Number(query.get('at')));

      return event
        ? { status: 200, body: { region, event: { ...event, logs: authLogs(region, event) } } }
        : { status: 404, body: { ok: false, error: 'Renewal not found.' } };
    }

    if (method === 'GET' && pathname === '/archive/run') {
      let status = archiveStatus(now);
      let id = query.get('id');
      let run = status.current?.id === id ? { ...status.current, running: true } : status.runs.find(candidate => candidate.id === id);

      return run
        ? { status: 200, body: { run: { ...run, logs: archiveLogs(run, now) } } }
        : { status: 404, body: { ok: false, error: 'Compression not found.' } };
    }

    if (method !== 'POST' || !body) {
      return { status: 404, body: { ok: false, error: 'Not found.' } };
    }

    if (pathname === '/auth/refresh') {
      if (!REGIONS.includes(body.region)) return { status: 400, body: { ok: false, error: 'Unknown region.' } };

      refreshed[body.region] = now;

      return { status: 200, body: { ok: true, ...authStatus(body.region, now) } };
    }

    if (pathname === '/auth/scheduling' || pathname === '/archive/scheduling') {
      if (typeof body.enabled !== 'boolean') return { status: 400, body: { ok: false, error: 'Enabled must be a boolean.' } };

      if (pathname === '/archive/scheduling') {
        archiveScheduled = body.enabled;

        return { status: 200, body: { ok: true, enabled: archiveScheduled } };
      }

      authScheduled = body.enabled;

      return { status: 200, body: { ok: true, results: REGIONS.map(region => ({ ok: true, region, enabled: authScheduled })) } };
    }

    if (pathname === '/archive/run') {
      if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
        return { status: 400, body: { ok: false, error: 'Dry run must be a boolean.' } };
      }

      let { current } = archiveStatus(now);

      if (current) return { status: 409, body: { ok: false, busy: true, current } };

      let run = { id: `manual-${now}`, trigger: 'manual', maxDays: 10, dryRun: body.dryRun === true, startedAt: now };
      compressions.push(run);

      return { status: 202, body: { ok: true, current: run } };
    }

    if (pathname === '/data/purge') {
      return { status: 200, body: { ok: true, purged: true } };
    }

    if (pathname === '/data/verify') {
      return { status: 200, body: { ok: false, error: 'Rendering site does not serve this Worker\'s data/coop.json yet' } };
    }

    if (pathname === '/social/account') {
      if (!ACCOUNTS.some(account => account.key === body.key)) {
        return { status: 400, body: { ok: false, error: `Unknown account: ${body.key}` } };
      }

      if (body.enabled) delete disabled[body.key];
      else disabled[body.key] ??= { at: now };

      return { status: 200, body: { ok: true, accounts: social(now).accounts } };
    }

    if (pathname === '/social/preview' || pathname === '/social/post') {
      let generator = GENERATORS.find(candidate => candidate.key === body.generator);

      if (!generator) return { status: 400, body: { ok: false, error: `Unknown status: ${body.generator}` } };

      if (generator.key.startsWith('splatfest') || generator.key.startsWith('eggstrawork')) {
        return { status: 400, body: { ok: false, error: 'There is nothing to post for this status right now' } };
      }

      if (pathname === '/social/preview') {
        let japanese = body.locale === 'ja-JP';

        return {
          status: 200,
          body: {
            ok: true,
            text: japanese
              ? `【シミュレーション】${generator.name}\n\nこれはローカルプレビュー用のサンプル投稿です。`
              : `[Simulated] ${generator.name}\n\nThis is sample post text from the local preview, not the generator's real wording.`,
            contentWrapper: null,
            media: [{ altText: `Simulated alt text for ${generator.name}.`, url: previewImage(generator.name, body.locale ?? 'en-US') }],
          },
        };
      }

      let events = (body.clients ?? []).map((key, index) => {
        let account = ACCOUNTS.find(candidate => candidate.key === key);
        let off = !!disabled[key];

        return {
          id: `manual-${now}-${index}`,
          at: now + index,
          type: off ? 'error' : 'posted',
          generator,
          client: { key, name: account?.name ?? key },
          locale: account?.locale ?? 'en-US',
          manual: true,
          ...(off && { error: 'Account is turned off or has no credentials' }),
        };
      });

      manualPosts.push(...events);

      return { status: 200, body: { ok: events.every(event => event.type === 'posted'), events } };
    }

    let state = lanes[body.lane];

    if (!state) return { status: 400, body: { ok: false, error: 'Unknown lane.' } };

    if (pathname === '/run') {
      if (state.manual) return { status: 409, body: { ok: false, busy: true, error: 'A manual run is already queued' } };

      if (body.lane === 'fast' && body.translations !== undefined && typeof body.translations !== 'boolean') {
        return { status: 400, body: { ok: false, error: 'translations must be true or false' } };
      }

      // Like the Scheduler: the fast lane's one option, and none for the slow lane.
      let options = body.lane === 'fast' ? { translations: body.translations ?? true } : {};
      let run = { id: `manual-${now}`, ...options, social: body.social === true, status: 'queued', requestedAt: now };

      state.manual = { run, startAt: now + 1500, endAt: now + (body.lane === 'fast' ? 9000 : 40_000) };

      return { status: 202, body: { ok: true, lane: body.lane, run } };
    }

    if (pathname === '/scheduling') {
      state.enabled = body.enabled === true;

      return { status: 200, body: { ok: true, lane: body.lane, enabled: state.enabled } };
    }

    return { status: 404, body: { ok: false, error: 'Not found.' } };
  }

  return { handle };
}
