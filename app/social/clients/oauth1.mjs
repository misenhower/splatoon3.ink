// OAuth 1.0a request signing (HMAC-SHA1) with WebCrypto, for X's v1.1 account endpoints.
// https://developer.x.com/en/docs/authentication/oauth-1-0a/creating-a-signature

function percentEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function base64(bytes) {
  let binary = '';

  for (let byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/**
 * Build the Authorization header for a request.
 * @param {object} request
 * @param {string} request.method
 * @param {string} request.url Request URL; its query parameters are signed
 * @param {Record<string, string>} [request.params] Form-encoded body parameters (signed); omit for multipart bodies
 * @param {{ consumerKey: string, consumerSecret: string, accessToken: string, accessSecret: string }} request.credentials
 * @param {string} [request.nonce]
 * @param {number} [request.timestamp] Seconds since the epoch
 * @returns {Promise<string>} The OAuth Authorization header value
 */
export async function oauth1Header({ method, url, params = {}, credentials, nonce, timestamp }) {
  let oauth = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonce ?? crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  let target = new URL(url);
  let signed = [
    ...Object.entries(oauth),
    ...target.searchParams.entries(),
    ...Object.entries(params),
  ].map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  let baseUrl = `${target.origin}${target.pathname}`;
  let baseString = [method.toUpperCase(), percentEncode(baseUrl), percentEncode(signed)].join('&');
  let signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.accessSecret)}`;

  let encoder = new TextEncoder();
  let key = await crypto.subtle.importKey('raw', encoder.encode(signingKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  let signature = base64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))));

  return 'OAuth ' + Object.entries({ ...oauth, oauth_signature: signature })
    .map(([name, value]) => `${percentEncode(name)}="${percentEncode(value)}"`)
    .join(', ');
}
