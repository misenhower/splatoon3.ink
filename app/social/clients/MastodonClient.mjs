import { login } from 'masto/fetch';
import Client from "./Client.mjs";

export default class MastodonClient extends Client
{
  key = 'mastodon';
  name = 'Mastodon';

  #url;
  #accessToken;

  constructor() {
    super();

    this.#url = process.env.MASTODON_URL;
    this.#accessToken = process.env.MASTODON_ACCESS_TOKEN;
  }

  async canSend() {
    return this.#url && this.#accessToken;
  }

  async send(status, generator) {
    // Mastodon API
    const masto = await login({
      url: this.#url,
      accessToken: this.#accessToken,
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

        let attachment = await masto.mediaAttachments.create(request);

        return attachment.id;
      }),
    );

    // Send status
    await masto.statuses.create({
      status: status.status,
      spoilerText: status.contentWrapper,
      sensitive: !!status.contentWrapper, // Without the sensitive property the image is still visible
      mediaIds,
    });
  }
}
