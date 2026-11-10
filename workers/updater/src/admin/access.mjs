import { createRemoteJWKSet, jwtVerify } from 'jose';

let keySets = new Map();

/**
 * Verify the Cloudflare Access token on an admin request. Fails closed: without the Access
 * settings, on another hostname, or with a bad token, nobody is signed in.
 * @param {Request} request
 * @param {object} env Needs ADMIN_HOSTNAME, ACCESS_TEAM_DOMAIN and ACCESS_AUD
 * @param {import('jose').JWTVerifyGetKey} [resolveKey] Key lookup for tests; defaults to the team's published keys
 * @returns {Promise<{ email: string } | null>} The signed-in administrator, or null
 */
export async function verifyAccess(request, env, resolveKey) {
  let domain = env.ACCESS_TEAM_DOMAIN;

  if (!domain || !env.ACCESS_AUD || !env.ADMIN_HOSTNAME || new URL(request.url).hostname !== env.ADMIN_HOSTNAME) {
    return null;
  }

  let token = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    return null;
  }

  try {
    let issuer = new URL(`https://${domain}`);

    if (issuer.hostname !== domain || !domain.endsWith('.cloudflareaccess.com')) {
      return null;
    }

    if (!resolveKey) {
      if (!keySets.has(domain)) {
        keySets.set(domain, createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer), { timeoutDuration: 5000 }));
      }

      resolveKey = keySets.get(domain);
    }

    let { payload } = await jwtVerify(token, resolveKey, {
      issuer: issuer.origin,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'sub'],
    });

    return { email: payload.email ?? 'Authenticated administrator' };
  } catch {
    return null;
  }
}
