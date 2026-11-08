# Splatoon3.ink

[Splatoon3.ink](https://splatoon3.ink) features Splatoon 3 map rotations, Salmon Run schedules, SplatNet gear, and more.

## Acknowledgements

Many thanks to the following projects for making Nintendo Switch Online automated logins possible:

* [nxapi](https://github.com/samuelthomas2774/nxapi)
* [imink](https://github.com/imink-app/f-API)

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Screenshot Generation

Cloudflare screenshots use the Worker's `BROWSER` binding directly. No Browser Run API
token or account ID is needed. The Cloudflare driver receives the binding explicitly:

```js
const driver = new CloudflareScreenshotDriver({ browser: env.BROWSER, env });
```

`SITE_URL` selects the frontend to render. Screenshots wait for the page's explicit
readiness marker after its data, fonts, images, and layout settle. Like Splatoon 2,
Browser Run uses 10-second navigation, readiness, and action timeouts, with up to
three retries after the first attempt (0.5/1/2-second backoff). Timeouts, network
errors, and HTTP 5xx are retried; authentication, rate-limit, and other validation
errors fail immediately. Exhausted retries surface the error to the caller.

For a capture-only test against `dev.splatoon3.ink`:

```sh
npm run screenshot:cloudflare
```

Then save a PNG from another terminal:

```sh
curl --fail-with-body --get 'http://127.0.0.1:8789/' \
  --data-urlencode 'route=schedules' \
  --output /tmp/splatoon3-schedules.png
```

The `route` parameter is the screenshot page's hash, including any query parameters
(for example, `schedules?time=1789531200000`). It defaults to `schedules`.
This local preview Worker captures images only; it does not update data, write
posting checkpoints, or send social posts. It is for local testing, not deployment.

Wrangler runs the endpoint on loopback with a **remote Browser binding**. Sign in
with `npx wrangler login` if needed. The browser must be able to reach the rendering
site, and captures use the account's Browser Run allowance. See
[Cloudflare Quick Actions](https://developers.cloudflare.com/browser-run/quick-actions/).

To capture an unpublished frontend, build and serve it, expose it through a tunnel,
and override the preview Worker's site URL:

```sh
npm run build
npm run preview
# In another terminal:
npx wrangler tunnel quick-start http://localhost:5050
# Use the printed tunnel URL:
npm run screenshot:cloudflare -- --var SITE_URL:https://example.trycloudflare.com
```

Local screenshots use `puppeteer-core` with an installed Chrome or Chromium (found
automatically on macOS and common Linux paths; otherwise set `CHROME_PATH`). They always
capture the built site in `dist/` through a temporary loopback server, regardless of
`SITE_URL`. No Docker browser service is needed.

```sh
npm run build
npm run screenshot -- --route schedules --output /tmp/splatoon3-local.png
```

The `--route` argument accepts a screenshot hash including its query parameters,
just like the Cloudflare preview's `route` parameter. Built-site captures need the
usual data and assets in `dist/`, or a build configured with `VITE_DATA_FROM`.

For Node social commands, set `SCREENSHOT_PROVIDER=local`. The binding-based
`cloudflare` provider runs through Workers tooling. Both providers wait for the
page-ready marker; the local driver also fails fast when the page reports a
screenshot error (for example, missing translations).

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
