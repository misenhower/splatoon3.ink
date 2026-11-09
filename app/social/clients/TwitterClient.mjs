import Client from './Client.mjs';
import { oauth1Header } from './oauth1.mjs';

const API_URL = 'https://api.x.com/1.1/';

/**
 * Direct X API access for seasonal profile updates (avatar and display name), which Buffer
 * cannot change. Posts go through BufferTwitterClient instead.
 */
export default class TwitterClient extends Client
{
  key = 'twitter';
  name = 'Twitter';

  get credentials() {
    return {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    };
  }

  async canSend() {
    return Object.values(this.credentials).every(Boolean);
  }

  async updateProfile(avatarBuffer, displayName) {
    // Multipart bodies are not part of the OAuth signature.
    let form = new FormData();
    form.append('image', new Blob([avatarBuffer], { type: 'image/png' }), 'avatar.png');
    await this.request('account/update_profile_image.json', { body: form });

    let params = { name: displayName };
    await this.request('account/update_profile.json', { params, body: new URLSearchParams(params) });
  }

  async request(path, { params = {}, body }) {
    let url = new URL(path, API_URL).href;
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: await oauth1Header({ method: 'POST', url, params, credentials: this.credentials }),
      },
      body,
    });

    if (!response.ok) {
      let detail = await response.text();

      try {
        let data = JSON.parse(detail);
        detail = data.errors?.map(error => error.message).join('; ') || data.detail || detail;
      } catch {
        // Use the body as-is
      }

      throw new Error(`X API ${path} failed (${response.status}): ${detail}`);
    }

    return response.json();
  }
}
