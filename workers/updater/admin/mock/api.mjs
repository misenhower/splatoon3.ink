// A simulated admin API for `npm run admin:dev`. It follows the real schedule and answers in
// the same shapes as workers/updater/src/admin/routes.mjs, with invented results. Nothing here
// talks to a Worker, Nintendo, or a social network.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const REGIONS = ['US', 'EU', 'JP', 'AP'];

const SCHEDULES = {
  fast: {
    second: 15,
    slots: [
      [0, 'quick'], [1, 'quick'], [2, 'quick'], [3, 'quick'], [4, 'quick'],
      [5, 'default'], [10, 'default'], [15, 'default'], [20, 'default'], [30, 'default'], [45, 'default'],
    ],
  },
  slow: { second: 45, slots: [[20, 'all']] },
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
    for (let [minute, mode] of [...schedule.slots].reverse()) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at <= now && slots.length < count) {
        slots.push({ at, mode });
      }
    }
  }

  return slots;
}

function nextSlot(schedule, now) {
  for (let hour = now - (now % HOUR); ; hour += HOUR) {
    for (let [minute, mode] of schedule.slots) {
      let at = hour + minute * MINUTE + schedule.second * 1000;

      if (at > now) return { at, mode };
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

  add('info', `Running ${run.mode} ${lane} updaters...`, 20);

  for (let result of run.updaters?.results ?? []) {
    add('info', `[${result.name}] Updating...`, 120);

    if (!result.ok) {
      add('error', `[${result.name}] ${result.error}`, result.ms);
    } else if (random(run.startedAt + result.ms) > 0.6) {
      add('debug', `[${result.name}] Data is unchanged`, result.ms);
    }
  }

  add('info', `Done running ${run.mode} ${lane} updaters`);

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
    mode: slot.mode,
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
    mode: slot.mode,
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
  let logs = run.logs ?? { lines: [], omitted: 0 };
  let summary = { ...run, logLines: logs.lines.length };

  delete summary.logs;
  delete summary.duration;

  return summary;
}

export function createMockApi() {
  let lanes = {
    fast: { enabled: true, paused: false, manual: null, extra: [] },
    slow: { enabled: true, paused: false, manual: null, extra: [] },
  };
  let refreshed = {};
  let disabled = { threads: { at: Date.now() - 26 * HOUR } };
  let manualPosts = [];

  // Posts follow the rotation clock. One delivery failed, to show what that looks like.
  function posts(now) {
    let events = [];

    for (let [key, { every, offset }] of Object.entries(POSTING)) {
      let generator = GENERATORS.find(candidate => candidate.key === key);
      let period = every * HOUR;

      for (let at = Math.floor((now - offset * HOUR) / period) * period + offset * HOUR, count = 0; count < (every <= 4 ? 8 : 2); at -= period, count++) {
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

  function history(lane, now) {
    let runs = [];

    if (lane === 'fast') {
      // One failure about an hour ago, retried a minute later.
      let slots = slotsBefore(SCHEDULES.fast, now, 48);
      let failingSlot = slots.find(slot => now - slot.at > 50 * MINUTE && slot.mode === 'default');

      for (let slot of slots) {
        if (slot === failingSlot) {
          runs.push(fastRun({ at: slot.at + MINUTE, mode: slot.mode }, now, { trigger: 'retry' }));
          runs.push(fastRun(slot, now, { failing: 'Co-op' }));
        } else {
          runs.push(fastRun(slot, now));
        }
      }
    } else {
      for (let slot of slotsBefore(SCHEDULES.slow, now, 14)) {
        let run = slowRun(slot, now);

        // The newest one may still be going; current() reports it instead.
        if (run.finishedAt <= now) runs.push(run);
      }
    }

    runs.push(...lanes[lane].extra);

    return runs
      .map(run => ({ ...run, logs: logsFor(run, lane) }))
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 50);
  }

  function current(lane, now) {
    let manual = lanes[lane].manual;

    if (manual && now >= manual.startAt) {
      return { startedAt: manual.startAt, mode: manual.run.mode, social: manual.run.social, trigger: 'manual' };
    }

    if (lane === 'slow' && lanes.slow.enabled && !lanes.slow.paused) {
      let [slot] = slotsBefore(SCHEDULES.slow, now, 1);
      let run = slowRun(slot, now);

      if (run.finishedAt > now) {
        return { startedAt: run.startedAt, mode: run.mode, social: true, trigger: 'scheduled' };
      }
    }

    return null;
  }

  function currentLogs(lane, now) {
    let running = current(lane, now);

    if (!running) return null;

    let names = lane === 'fast' ? FAST_UPDATERS : SLOW_UPDATERS;
    let lines = [{ at: running.startedAt + 20, level: 'info', text: `Running ${running.mode} ${lane} updaters...` }];
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
    let runs = history(lane, now);
    let running = current(lane, now);
    let manual = state.manual;

    return {
      lane,
      enabled: state.enabled,
      paused: state.paused,
      next: state.enabled ? nextSlot(SCHEDULES[lane], now) : null,
      retryAt: null,
      retries: 0,
      continuing: false,
      continuations: 0,
      lastRun: runs[0] ? summarize(runs[0]) : null,
      pending: manual ? { ...manual.run, status: now >= manual.startAt ? 'running' : 'queued' } : null,
      running: !!running,
      current: running && { ...running, logLines: currentLogs(lane, now).lines.length },
      alarmAt: state.paused || !state.enabled ? null : nextSlot(SCHEDULES[lane], now).at,
      history: runs.map(summarize),
    };
  }

  function authStatus(region, now) {
    let offset = (35 + REGIONS.indexOf(region)) * MINUTE;
    let events = [];

    for (let hour = now - (now % HOUR); events.length < 6; hour -= HOUR) {
      let at = hour + offset;

      if (at > now) continue;

      // The AP region trips once, two renewals ago, to show what a failure looks like.
      let failed = region === 'AP' && events.length === 1;

      events.push({
        at,
        finishedAt: at + 2200 + Math.round(random(at) * 1500),
        ok: !failed,
        errors: failed ? ['Invalid bullet token response code: 502'] : [],
      });
    }

    if (refreshed[region]) {
      events.unshift({ at: refreshed[region], finishedAt: refreshed[region] + 2400, ok: true, errors: [] });
    }

    let hour = now - (now % HOUR);

    return {
      region,
      alarmAt: hour + offset > now ? hour + offset : hour + HOUR + offset,
      lastRefreshAt: events[0]?.finishedAt ?? null,
      hasSessionToken: true,
      events,
    };
  }

  function log(now) {
    let lines = [];

    for (let lane of Object.keys(lanes)) {
      let live = currentLogs(lane, now);

      lines.push(...(live?.lines ?? []).map(line => ({ ...line, runId: 'current', source: lane })));

      for (let run of history(lane, now).slice(0, lane === 'fast' ? 30 : 3)) {
        lines.push(...run.logs.lines.map(line => ({ ...line, runId: run.id, source: lane })));
      }
    }

    for (let region of REGIONS) {
      for (let event of authStatus(region, now).events) {
        lines.push(event.ok
          ? { at: event.finishedAt, level: 'info', text: `${region}: credentials renewed`, source: 'auth' }
          : { at: event.finishedAt, level: 'error', text: `${region}: ${event.errors[0]}`, source: 'auth' });
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
          modes: ['quick', 'default', 'all'],
          schedules: SCHEDULES,
          lanes: Object.fromEntries(Object.keys(lanes).map(lane => [lane, laneStatus(lane, now)])),
          auth: Object.fromEntries(REGIONS.map(region => [region, authStatus(region, now)])),
          posts: posts(now).slice(0, 80),
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

      return run ? { status: 200, body: { lane, run } } : { status: 404, body: { ok: false, error: 'Run not found.' } };
    }

    if (method !== 'POST' || !body) {
      return { status: 404, body: { ok: false, error: 'Not found.' } };
    }

    if (pathname === '/auth/refresh') {
      if (!REGIONS.includes(body.region)) return { status: 400, body: { ok: false, error: 'Unknown region.' } };

      refreshed[body.region] = now;

      return { status: 200, body: { ok: true, ...authStatus(body.region, now) } };
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
      if (state.paused) return { status: 409, body: { ok: false, paused: true, error: 'Scheduler is paused' } };
      if (state.manual) return { status: 409, body: { ok: false, busy: true, error: 'A manual run is already queued' } };

      let run = { id: `manual-${now}`, mode: body.mode, social: body.social === true, status: 'queued', requestedAt: now };

      state.manual = { run, startAt: now + 1500, endAt: now + (body.lane === 'fast' ? 9000 : 40_000) };

      return { status: 202, body: { ok: true, lane: body.lane, run } };
    }

    if (pathname === '/scheduling') {
      state.enabled = body.enabled === true;

      return { status: 200, body: { ok: true, lane: body.lane, enabled: state.enabled } };
    }

    if (pathname === '/pause') {
      state.paused = body.paused === true;

      return { status: 200, body: { ok: true, lane: body.lane, paused: state.paused } };
    }

    return { status: 404, body: { ok: false, error: 'Not found.' } };
  }

  return { handle };
}
