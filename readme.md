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

Set `SCREENSHOT_PROVIDER` explicitly for social-media screenshots. Use `browserless` for local development with the Docker Compose development configuration. Use `cloudflare` in production to call Cloudflare Browser Run Quick Actions against `${SITE_URL}/screenshots/`.

The Cloudflare provider requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_BROWSER_RUN_API_TOKEN`. Create the API token with the **Browser Rendering Write** permission. The provider does not automatically fall back to Browserless when a Cloudflare request fails.

Wrangler can run a local browser for Puppeteer, Playwright, and CDP-based Workers, but Quick Actions are not supported by its local browser binding. Quick Actions require remote mode, so testing this provider still requires Cloudflare to reach the rendered page.

To test the real Cloudflare provider against a local build, build and serve `dist` in one terminal:

```sh
npm run build
npm run preview
```

Expose that server through a temporary Wrangler tunnel in a second terminal:

```sh
npx wrangler@latest tunnel quick-start http://localhost:5050
```

In a third terminal, use the printed `https://*.trycloudflare.com` URL for that run:

```sh
SCREENSHOT_PROVIDER=cloudflare SITE_URL=https://example.trycloudflare.com npm run social:test
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
