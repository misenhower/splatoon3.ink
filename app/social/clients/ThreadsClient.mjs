import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import Client from './Client.mjs';
import ValueCache from '../../common/ValueCache.mjs';

export default class ThreadsClient extends Client {
  key = 'threads';
  name = 'Threads';

  #baseUrl = 'https://graph.threads.net/v1.0';
  #tokenCache = new ValueCache('threads.token');
  #accessToken;

  async canSend() {
    return process.env.THREADS_USER_ID
      && process.env.THREADS_ACCESS_TOKEN
      && process.env.AWS_S3_BUCKET
      && process.env.AWS_S3_ENDPOINT;
  }

  async #getAccessToken() {
    if (this.#accessToken) {
      return this.#accessToken;
    }

    // Try to use a previously refreshed token from cache
    let cached = await this.#tokenCache.getData();
    if (cached) {
      this.#accessToken = cached;
      return this.#accessToken;
    }

    // Fall back to the .env token
    this.#accessToken = process.env.THREADS_ACCESS_TOKEN;
    return this.#accessToken;
  }

  async #refreshToken() {
    let currentToken = await this.#getAccessToken();

    let params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: currentToken,
    });

    let response = await fetch(`${this.#baseUrl}/refresh_access_token?${params}`);
    let data = await response.json();

    if (data.error) {
      console.error(`[${this.name}] Failed to refresh token:`, data.error.message);
      return;
    }

    this.#accessToken = data.access_token;

    // Cache the token with its expiry
    let expires = new Date(Date.now() + data.expires_in * 1000);
    await this.#tokenCache.setData(data.access_token, expires);

    console.log(`[${this.name}] Token refreshed, expires ${expires.toISOString()}`);
  }

  async send(status, generator) {
    if (!status.media?.length) {
      console.error(`[${this.name}] No media provided for ${generator.key}`);
      return;
    }

    try {
      // Refresh the token if it hasn't been refreshed in the last 24 hours
      let lastRefresh = await this.#tokenCache.getCachedAt();
      let oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (!lastRefresh || lastRefresh < oneDayAgo) {
        await this.#refreshToken();
      }

      let accessToken = await this.#getAccessToken();
      let jpeg = await sharp(status.media[0].file).jpeg().toBuffer();

      // Upload image to S3 so it's publicly accessible
      let imageUrl = await this.#uploadImage(jpeg, generator.key);

      // Create a media container
      let containerId = await this.#createContainer(status.status, imageUrl, accessToken);

      // Wait for the container to finish processing
      await this.#waitForContainer(containerId, accessToken);

      // Publish the container
      await this.#publish(containerId, accessToken);
    } catch (error) {
      console.error(`[${this.name}] Failed to post ${generator.key}:`, error.message);
      throw error;
    }
  }

  async #uploadImage(buffer, key) {
    let s3 = new S3Client({
      endpoint: process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    let s3Key = `status-screenshots/${key}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }));

    // Construct the public URL (path-style to avoid SSL issues with dotted bucket names)
    return `${process.env.AWS_S3_ENDPOINT}/${process.env.AWS_S3_BUCKET}/${s3Key}`;
  }

  async #createContainer(text, imageUrl, accessToken) {
    let userId = process.env.THREADS_USER_ID;
    let params = new URLSearchParams({
      media_type: 'IMAGE',
      image_url: imageUrl,
      text,
      access_token: accessToken,
    });

    let response = await fetch(`${this.#baseUrl}/${userId}/threads`, {
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

  async #waitForContainer(containerId, accessToken) {
    // Poll container status until it's ready (or timeout after 60s)
    let maxAttempts = 12;

    for (let i = 0; i < maxAttempts; i++) {
      let params = new URLSearchParams({
        fields: 'status',
        access_token: accessToken,
      });

      let response = await fetch(`${this.#baseUrl}/${containerId}?${params}`);
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

  async #publish(containerId, accessToken) {
    let userId = process.env.THREADS_USER_ID;
    let params = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    let response = await fetch(`${this.#baseUrl}/${userId}/threads_publish`, {
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
