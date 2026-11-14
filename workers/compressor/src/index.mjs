// splatoon3.ink archive compressor Worker: once a day, runs app/data/ArchiveCompressor.mjs in a
// Cloudflare Container against the archive Space. See workers/compressor/README.md.

import { Compressor } from './Compressor.mjs';

export { Compressor };

function compressor(env) {
  return env.COMPRESSOR.getByName('archive');
}

function timingSafeEqual(a, b) {
  let encoder = new TextEncoder();
  let left = encoder.encode(a);
  let right = encoder.encode(b);

  return left.byteLength === right.byteLength && crypto.subtle.timingSafeEqual(left, right);
}

function authorized(request, env) {
  if (!env.RUN_TOKEN) {
    return false;
  }

  let [scheme, token] = (request.headers.get('Authorization') ?? '').split(' ');

  return scheme === 'Bearer' && !!token && timingSafeEqual(token, env.RUN_TOKEN);
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    if (!authorized(request, env)) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    let url = new URL(request.url);
    let route = `${request.method} ${url.pathname}`;

    if (route === 'GET /status') {
      return json(await compressor(env).status());
    }

    if (route === 'GET /run') {
      let run = await compressor(env).run(url.searchParams.get('id') ?? '');

      return run ? json(run) : json({ ok: false, error: 'Not found' }, 404);
    }

    if (route === 'POST /run') {
      let maxDays = url.searchParams.get('maxDays');
      let result = await compressor(env).start({
        trigger: 'manual',
        maxDays: maxDays === null ? undefined : Number(maxDays),
        dryRun: url.searchParams.get('dryRun') === 'true',
      });

      return json(result, result.ok ? 202 : result.busy ? 409 : 400);
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },

  async scheduled(controller, env) {
    let result = await compressor(env).start({ trigger: 'scheduled' });

    if (!result.ok) {
      console.warn(JSON.stringify({ event: 'compress-skipped', ...result }));
    }
  },
};
