// Reimplementation of the nxapi code path splatoon3.ink actually exercises, so the same code
// runs in Node and in Cloudflare Workers (importing the nxapi package crashes workerd):
//
//   Nintendo Account session token
//     -> Nintendo Account token + user            (accounts.nintendo.com)
//     -> nxapi znca-api bearer token              (client assertion, scope ca:gf ca:er ca:dr)
//     -> genf with encrypt_token_request          (znca-api produces the encrypted Coral body)
//     -> POST /v4/Account/Login                   (api-lp1.znc.srv.nintendo.net, octet-stream)
//     -> decrypt-response                         (znca-api)
//     -> same genf/POST/decrypt for /v4/Game/GetWebServiceToken
//
// Mirrors nxapi 1.6.1-next.257 (dist/api/coral.js, f.js, na.js, common/remote-config.js) using only
// fetch, WebCrypto, TextEncoder and atob/btoa. No Node built-ins.

const NA_CLIENT_ID = '71b963c1b7b6d119';
const ZNC_URL = 'https://api-lp1.znc.srv.nintendo.net';
const ZNCA_PLATFORM = 'Android';
const ZNCA_PLATFORM_VERSION = '12';
const ZNCA_API_COMPATIBILITY_VERSION = 'd8fAZDPzwimzQ7c6';
const ZNCA_API_SCOPE = 'ca:gf ca:er ca:dr';
const CONFIG_URL = 'https://fancy.org.uk/api/nxapi/config';

// The nxapi release whose protocol this file mirrors. The remote config endpoint varies its
// answer on these headers and refuses versions it no longer supports (nxapi's own kill switch).
// When it does, compare these constants and the request shapes below with the current nxapi
// release (ZNCA_VERSION and ZNCA_API_COMPATIBILITY_VERSION in dist/api/coral.js).
const NXAPI_COMPAT_VERSION = '1.6.1';
const ZNCA_COMPAT_VERSION = '3.5.0';

export const HashMethod = { CORAL: '1', WEB_SERVICE: '2' };

export class HttpError extends Error {
  constructor(label, response, data) {
    super(`${label}: ${response.status} ${response.statusText}`);
    this.name = 'HttpError';
    this.status = response.status;
    this.url = response.url;
    this.data = data;
  }
}

async function readBody(response) {
  let text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function expectOk(response, label) {
  if (!response.ok) {
    throw new HttpError(label, response, await readBody(response));
  }
}

// Base64 helpers on plain Uint8Array (no Buffer).
function base64Encode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64Decode(value) {
  // Accept both the standard and URL-safe alphabets, padded or not (Buffer.from is lenient too).
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  normalized += '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
}

function base64UrlEncode(bytes) {
  return base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Same JWT that app/splatnet/NsoClient.mjs builds with node:crypto, using WebCrypto instead.
export async function createClientAssertion(clientId, sharedSecret, audience, lifetimeSeconds = 300) {
  let encoder = new TextEncoder();
  let now = Math.floor(Date.now() / 1000);
  let header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  let payload = base64UrlEncode(encoder.encode(JSON.stringify({
    typ: 'client_assertion',
    iss: clientId,
    aud: audience,
    exp: now + lifetimeSeconds,
    iat: now,
  })));
  let key = await crypto.subtle.importKey(
    'raw', encoder.encode(sharedSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  let signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`)));

  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

// nxapi's remote configuration: the znca app version to impersonate, which f-generation
// provider to use, and whether Coral authentication is allowed at all.
export async function getRemoteConfig(userAgent) {
  let response = await fetch(CONFIG_URL, {
    headers: {
      'User-Agent': userAgent,
      'X-nxapi-Version': NXAPI_COMPAT_VERSION,
      'X-znca-Compatible-Version': ZNCA_COMPAT_VERSION,
    },
  });
  await expectOk(response, '[nxapi] remote config');
  let config = await response.json();

  if (!config.require_version?.includes(NXAPI_COMPAT_VERSION)) {
    throw new Error(`[nxapi] remote config no longer supports protocol version ${NXAPI_COMPAT_VERSION} (accepts ${config.require_version?.join(', ')})`);
  }
  if (!config.coral) {
    throw new Error('Remote configuration prevents Coral authentication');
  }
  let provider = config.coral_auth?.default;
  if (!Array.isArray(provider) || provider[0] !== 'nxapi' || !provider[1]) {
    throw new Error(`[nxapi] remote config selects an unsupported f-generation provider: ${JSON.stringify(provider)}`);
  }

  return {
    zncaVersion: config.coral.znca_version,
    zncaApiUrl: provider[1],
    splatnet3: config.coral_gws_splatnet3 ?? null,
    cacheControl: response.headers.get('Cache-Control'),
  };
}

// Client for the nxapi znca-api (f generation + request encryption/response decryption).
export class ZncaApiClient {
  constructor({ url, clientId, sharedSecret, zncaVersion, userAgent }) {
    this.url = url.endsWith('/') ? url : `${url}/`;
    this.origin = new URL(url).origin;
    this.clientId = clientId;
    this.sharedSecret = sharedSecret;
    this.zncaVersion = zncaVersion;
    this.userAgent = userAgent;
    this.token = null;
  }

  async _getJson(url) {
    let response = await fetch(url, { headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' } });
    await expectOk(response, `[znca-api] ${url}`);
    return response.json();
  }

  // OAuth 2 protected-resource discovery, then client_credentials with a JWT client assertion.
  async authenticate() {
    let resource = await this._getJson(`${this.origin}/.well-known/oauth-protected-resource`);
    let issuer = resource.authorization_servers?.[0];
    if (!issuer) throw new Error('[znca-api] no authorization server advertised');

    let issuerUrl = new URL(issuer);
    issuerUrl.pathname = '/.well-known/oauth-authorization-server' + (issuerUrl.pathname === '/' ? '' : issuerUrl.pathname);
    let server = await this._getJson(issuerUrl);
    if (!server.token_endpoint) throw new Error('[znca-api] authorization server has no token endpoint');

    let body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: ZNCA_API_SCOPE,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: await createClientAssertion(this.clientId, this.sharedSecret, server.issuer),
    });
    let response = await fetch(server.token_endpoint, {
      method: 'POST',
      headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
      body,
    });
    await expectOk(response, '[znca-api] token');
    let result = await response.json();

    this.token = {
      token: result.access_token,
      expiresAt: Date.now() + result.expires_in * 1000,
      scope: result.scope ?? null,
    };

    return { expiresIn: result.expires_in, scope: result.scope ?? null, tokenEndpoint: server.token_endpoint };
  }

  async _post(path, body, accept = 'application/json') {
    if (!this.token || this.token.expiresAt <= Date.now()) {
      await this.authenticate();
    }

    let response = await fetch(new URL(path, this.url), {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgent,
        'X-znca-Client-Version': ZNCA_API_COMPATIBILITY_VERSION,
        'X-znca-Platform': ZNCA_PLATFORM,
        'X-znca-Version': this.zncaVersion,
        'Content-Type': 'application/json',
        'Accept': accept,
        'Authorization': `Bearer ${this.token.token}`,
      },
      body: JSON.stringify(body),
    });
    await expectOk(response, `[znca-api] ${path}`);

    return response;
  }

  // Generate f and, in the same call, the encrypted body for the Coral request that will use it.
  async genf(token, hashMethod, user, encryptTokenRequest) {
    let response = await this._post('f', {
      hash_method: hashMethod,
      token,
      ...user,
      encrypt_token_request: encryptTokenRequest,
    });
    let data = await response.json();
    if ('error' in data) {
      throw new Error(`[znca-api] ${data.error_message ?? data.error}`);
    }
    if (!data.encrypted_token_request) {
      throw new Error('[znca-api] f response did not include encrypted_token_request');
    }

    return {
      f: data.f,
      timestamp: data.timestamp,
      requestId: data.request_id,
      encryptedRequest: base64Decode(data.encrypted_token_request),
    };
  }

  // Decrypt a Coral response body. Without the ca:na scope nxapi asks for text/plain and gets
  // the decrypted JSON text back directly.
  async decryptResponse(bytes) {
    let response = await this._post('decrypt-response', { data: base64Encode(bytes) }, 'text/plain');
    return JSON.parse(await response.text());
  }
}

export async function getNintendoAccountToken(sessionToken) {
  let response = await fetch('https://accounts.nintendo.com/connect/1.0.0/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 8.0.0)',
    },
    body: JSON.stringify({
      client_id: NA_CLIENT_ID,
      session_token: sessionToken,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token',
    }),
  });
  await expectOk(response, '[na] token');
  let token = await response.json();
  if ('error' in token) throw new Error(`[na] ${token.error_description ?? token.error}`);
  if ('errorCode' in token) throw new Error(`[na] ${token.detail}`);

  return token; // { access_token, id_token, expires_in, scope, token_type }
}

export async function getNintendoAccountUser(naToken) {
  let response = await fetch('https://api.accounts.nintendo.com/2.0.0/users/me', {
    headers: {
      'Accept-Language': 'en-GB',
      'User-Agent': 'NASDKAPI; Android',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${naToken.access_token}`,
    },
  });
  await expectOk(response, '[na] users/me');
  let user = await response.json();
  if ('errorCode' in user) throw new Error(`[na] ${user.detail}`);

  return user; // { id, birthday, country, language, nickname, ... }
}

// POST an already-encrypted body to Coral and decrypt the reply. Header set mirrors nxapi:
// the unauthenticated Login call sends the short set, authenticated calls add the rest.
async function coralRequest(path, encryptedBody, { znca, zncaVersion, accessToken = null }) {
  let headers = {
    'User-Agent': `com.nintendo.znca/${zncaVersion}(${ZNCA_PLATFORM}/${ZNCA_PLATFORM_VERSION})`,
    'X-Platform': ZNCA_PLATFORM,
    'X-ProductVersion': zncaVersion,
    'Content-Type': 'application/octet-stream',
    'Accept': 'application/octet-stream,application/json',
  };
  if (accessToken) {
    Object.assign(headers, {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Language': 'en-GB',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
    });
  }

  let response = await fetch(ZNC_URL + path, { method: 'POST', headers, body: encryptedBody });
  let bytes = new Uint8Array(await response.arrayBuffer());

  let data;
  if (/^application\/json($|;)/i.test(response.headers.get('Content-Type') ?? '')) {
    data = await znca.decryptResponse(bytes);
  } else {
    let text = new TextDecoder().decode(bytes);
    throw new HttpError(`[znc] ${path} ${response.ok ? 'unacceptable response type' : 'error'}`, response, text);
  }

  if (!response.ok) throw new HttpError(`[znc] ${path}`, response, data);
  if ('errorMessage' in data) throw new Error(`[znc] ${path}: ${data.errorMessage} (status ${data.status})`);
  if (data.status !== 0) throw new Error(`[znc] ${path}: Coral status ${data.status}`);

  return data;
}

export async function loginWithSessionToken(sessionToken, { znca, zncaVersion }) {
  let naToken = await getNintendoAccountToken(sessionToken);
  let user = await getNintendoAccountUser(naToken);

  let parameter = {
    naIdToken: naToken.id_token,
    language: user.language,
    // Filled in by znca-api while encrypting.
    timestamp: 0,
    requestId: '',
    f: '',
  };
  let fdata = await znca.genf(naToken.id_token, HashMethod.CORAL, { na_id: user.id }, {
    url: `${ZNC_URL}/v4/Account/Login`,
    parameter,
  });

  let data = await coralRequest('/v4/Account/Login', fdata.encryptedRequest, { znca, zncaVersion });

  return {
    user,
    coralUserId: data.result.user.id,
    credential: data.result.webApiServerCredential, // { accessToken, expiresIn }
  };
}

export async function getWebServiceToken(id, { znca, zncaVersion, coralAccessToken, coralUserId, naId }) {
  let parameter = { id, registrationToken: '', f: '', requestId: '', timestamp: 0 };
  let fdata = await znca.genf(coralAccessToken, HashMethod.WEB_SERVICE, {
    na_id: naId,
    coral_user_id: `${coralUserId}`,
  }, {
    url: `${ZNC_URL}/v4/Game/GetWebServiceToken`,
    parameter,
  });

  let data = await coralRequest('/v4/Game/GetWebServiceToken', fdata.encryptedRequest, {
    znca, zncaVersion, accessToken: coralAccessToken,
  });

  return data.result; // { accessToken, expiresIn }
}
