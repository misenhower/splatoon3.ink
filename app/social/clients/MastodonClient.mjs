import { createRestAPIClient } from 'masto';
import Client from './Client.mjs';

export default class MastodonClient extends Client
{
  key = 'mastodon';
  name = 'Mastodon';

  _url;
  _accessToken;
  _visibility;

  constructor() {
    super();

    this._url = process.env.MASTODON_URL;
    this._accessToken = process.env.MASTODON_ACCESS_TOKEN;
    this._visibility = process.env.MASTODON_VISIBILITY || 'public';
  }

  async canSend() {
    return this._url && this._accessToken;
  }

  async updateProfile(avatarBuffer, displayName) {
    const masto = await createRestAPIClient({
      url: this._url,
      accessToken: this._accessToken,
      disableVersionCheck: true,
      disableExperimentalWarning: true,
    });

    await masto.v1.accounts.updateCredentials({
      avatar: new Blob([avatarBuffer]),
      displayName,
    });
  }

  async send(status, generator) {
    if (!status.media?.length) {
      console.error(`[${this.name}] No media provided for ${generator.key}`);
      return;
    }

    try {
      // Mastodon API
      const masto = await createRestAPIClient({
        url: this._url,
        accessToken: this._accessToken,
        disableVersionCheck: true,
        disableExperimentalWarning: true,
      });

      // Upload images
      let mediaIds = await Promise.all(
        status.media.map(async m => {
          let request = { file: new Blob([m.file]) };
          if (m.altText) {
            request.description = m.altText;
          }

          let attachment = await masto.v2.media.create(request);

          return attachment.id;
        }),
      );

      // Send status
      await masto.v1.statuses.create({
        status: status.status,
        spoilerText: status.contentWrapper,
        sensitive: !!status.contentWrapper, // Without the sensitive property the image is still visible
        mediaIds,
        visibility: this._visibility,
      });
    } catch (error) {
      console.error(`[${this.name}] Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }
}
