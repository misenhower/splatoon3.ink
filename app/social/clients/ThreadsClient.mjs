import sharp from 'sharp';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import Client from './Client.mjs';
import prefixedConsole from '../../common/prefixedConsole.mjs';
import ValueCache from '../../common/ValueCache.mjs';

export default class ThreadsClient extends Client {
  key = 'threads';
  name = 'Threads';

  _baseUrl = 'https://graph.threads.net/v1.0';
  _tokenCache = new ValueCache('threads.token');
  _accessToken;

  get console() {
    return this._console ??= prefixedConsole('Social', this.name);
  }

  async canSend() {
    return process.env.THREADS_USER_ID
      && process.env.THREADS_ACCESS_TOKEN
      && process.env.AWS_S3_BUCKET
      && process.env.AWS_S3_ENDPOINT;
  }

  async _getAccessToken() {
    if (this._accessToken) {
      return this._accessToken;
    }

    // Try to use a previously refreshed token from cache
    let cached = await this._tokenCache.getData();
    if (cached) {
      this._accessToken = cached;
      return this._accessToken;
    }

    // Fall back to the .env token
    this._accessToken = process.env.THREADS_ACCESS_TOKEN;
    return this._accessToken;
  }

  async _refreshToken() {
    let currentToken = await this._getAccessToken();

    let params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: currentToken,
    });

    let response = await fetch(`${this._baseUrl}/refresh_access_token?${params}`);
    let data = await response.json();

    if (data.error) {
      this.console.error('Failed to refresh token:', data.error.message);
      return;
    }

    this._accessToken = data.access_token;

    // Cache the token with its expiry
    let expires = new Date(Date.now() + data.expires_in * 1000);
    await this._tokenCache.setData(data.access_token, expires);

    this.console.log(`Token refreshed, expires ${expires.toISOString()}`);
  }

  async send(status, generator) {
    if (!status.media?.length) {
      this.console.error(`No media provided for ${generator.key}`);
      return;
    }

    try {
      // Refresh the token if it hasn't been refreshed in the last 24 hours
      let lastRefresh = await this._tokenCache.getCachedAt();
      let oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (!lastRefresh || lastRefresh < oneDayAgo) {
        await this._refreshToken();
      }

      let accessToken = await this._getAccessToken();
      let jpeg = await sharp(status.media[0].file).jpeg().toBuffer();

      // Upload image to S3 so it's publicly accessible
      let { imageUrl, s3Key } = await this._uploadImage(jpeg, generator.key);

      try {
        // Create a media container
        let containerId = await this._createContainer(status.status, imageUrl, accessToken);

        // Wait for the container to finish processing
        await this._waitForContainer(containerId, accessToken);

        // Publish the container
        await this._publish(containerId, accessToken);
      } finally {
        // Clean up the temporary image from S3
        await this._deleteImage(s3Key);
      }
    } catch (error) {
      this.console.error(`Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }

  async _uploadImage(buffer, key) {
    let s3 = new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    let s3Key = `threads-tmp/${key}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    // Construct the public URL (path-style to avoid SSL issues with dotted bucket names)
    let imageUrl = `${process.env.AWS_S3_ENDPOINT}/${process.env.AWS_S3_BUCKET}/${s3Key}`;
    this.console.log(`Image uploaded: ${imageUrl}`);
    return { imageUrl, s3Key };
  }

  async _deleteImage(s3Key) {
    try {
      let s3 = new S3Client({
        endpoint: process.env.AWS_S3_ENDPOINT,
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
      }));
      this.console.log(`Temporary image deleted: ${s3Key}`);
    } catch (error) {
      this.console.error('Failed to delete temporary image:', error.message);
    }
  }

  async _createContainer(text, imageUrl, accessToken) {
    let userId = process.env.THREADS_USER_ID;
    let params = new URLSearchParams({
      media_type: 'IMAGE',
      image_url: imageUrl,
      text,
      access_token: accessToken,
    });

    let response = await fetch(`${this._baseUrl}/${userId}/threads`, {
      method: 'POST',
      body: params,
    });

    let data = await response.json();

    if (data.error) {
      throw new Error(`${data.error.message} (type: ${data.error.type}, code: ${data.error.code}, fbtrace_id: ${data.error.fbtrace_id})`);
    }

    if (!data.id) {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }

    return data.id;
  }

  async _waitForContainer(containerId, accessToken) {
    // Poll container status until it's ready (or timeout after 60s)
    let maxAttempts = 12;

    for (let i = 0; i < maxAttempts; i++) {
      let params = new URLSearchParams({
        fields: 'status',
        access_token: accessToken,
      });

      let response = await fetch(`${this._baseUrl}/${containerId}?${params}`);
      let data = await response.json();

      if (data.status === 'FINISHED') {
        return;
      }

      if (data.status === 'ERROR') {
        throw new Error(`Container processing failed: ${JSON.stringify(data)}`);
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Container processing timed out');
  }

  async _publish(containerId, accessToken) {
    let userId = process.env.THREADS_USER_ID;
    let params = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    let response = await fetch(`${this._baseUrl}/${userId}/threads_publish`, {
      method: 'POST',
      body: params,
    });

    let data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.id;
  }
}
