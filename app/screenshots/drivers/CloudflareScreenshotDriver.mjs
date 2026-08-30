import { URL } from 'url';

export default class CloudflareScreenshotDriver
{
  _config = null;
  _env;
  _fetch;

  constructor({ env = process.env, fetch = globalThis.fetch } = {}) {
    this._env = env;
    this._fetch = fetch;
  }

  async open() {
    let names = [
      'SITE_URL',
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_BROWSER_RUN_API_TOKEN',
    ];
    let missing = names.filter(name => !this._env[name]);
    if (missing.length) {
      throw new Error(`Missing Cloudflare screenshot configuration: ${missing.join(', ')}`);
    }

    this._config = {
      siteUrl: this._env.SITE_URL,
      accountId: this._env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: this._env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
    };
  }

  async capture(route, viewport) {
    let url = new URL('/screenshots/', this._config.siteUrl);
    url.hash = route;

    let endpoint = new URL(
      `/client/v4/accounts/${this._config.accountId}/browser-rendering/screenshot`,
      'https://api.cloudflare.com',
    );
    endpoint.searchParams.set('cacheTTL', '0');

    let response = await this._fetch(endpoint.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.toString(),
        viewport,
        gotoOptions: { waitUntil: 'networkidle0' },
        waitForTimeout: 1000,
        screenshotOptions: { type: 'png' },
      }),
    });

    if (!response.ok) {
      let message = await this._errorMessage(response);
      throw new Error(`Cloudflare Browser Run screenshot failed (${response.status}): ${message}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async _errorMessage(response) {
    let body = await response.text();

    try {
      let result = JSON.parse(body);
      let messages = result.errors?.map(error => error.message).filter(Boolean);
      if (messages?.length) {
        return messages.join('; ');
      }
    } catch {
      // Use the response body as-is when Cloudflare does not return JSON.
    }

    return body || response.statusText || 'Unknown error';
  }

  async close() {
    this._config = null;
  }
}
