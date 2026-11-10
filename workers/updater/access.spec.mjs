import { describe, expect, it } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';
import { verifyAccess } from './src/admin/access.mjs';

const settings = {
  ADMIN_HOSTNAME: 'admin.test',
  ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com',
  ACCESS_AUD: 'audience-tag',
};

const keys = await generateKeyPair('RS256');
const resolveKey = async () => keys.publicKey;

function token({ issuer = 'https://team.cloudflareaccess.com', audience = 'audience-tag', expires = '5m', key = keys.privateKey, email = 'admin@example.test' } = {}) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject('user-1')
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key);
}

function request(jwt, url = 'https://admin.test/') {
  return new Request(url, { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });
}

describe('Cloudflare Access check', () => {
  it('accepts a token for this application signed by the team', async () => {
    expect(await verifyAccess(request(await token()), settings, resolveKey)).toEqual({ email: 'admin@example.test' });
  });

  it('refuses requests without a token', async () => {
    expect(await verifyAccess(request(null), settings, resolveKey)).toBeNull();
  });

  it('refuses tokens for another application, another team, or past their expiry', async () => {
    expect(await verifyAccess(request(await token({ audience: 'another-app' })), settings, resolveKey)).toBeNull();
    expect(await verifyAccess(request(await token({ issuer: 'https://other.cloudflareaccess.com' })), settings, resolveKey)).toBeNull();
    expect(await verifyAccess(request(await token({ expires: '-1m' })), settings, resolveKey)).toBeNull();
  });

  it('refuses a token signed with another key', async () => {
    let other = await generateKeyPair('RS256');

    expect(await verifyAccess(request(await token({ key: other.privateKey })), settings, resolveKey)).toBeNull();
  });

  it('refuses a valid token on any other hostname', async () => {
    expect(await verifyAccess(request(await token(), 'https://updater.test/'), settings, resolveKey)).toBeNull();
  });

  it('stays closed until every Access setting is present, and only trusts Access team domains', async () => {
    let jwt = await token();

    for (let name of Object.keys(settings)) {
      expect(await verifyAccess(request(jwt), { ...settings, [name]: undefined }, resolveKey)).toBeNull();
    }

    let lookalike = await token({ issuer: 'https://team.example.com' });

    expect(await verifyAccess(request(lookalike), { ...settings, ACCESS_TEAM_DOMAIN: 'team.example.com' }, resolveKey)).toBeNull();
  });
});
