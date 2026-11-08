// node:crypto in the Workers runtime has no shake256; this pure-JS version is byte-identical.
import { shake256 } from '@noble/hashes/sha3.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export function getTopOfCurrentHour(date = null) {
  date ??= new Date;

  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);

  return date;
}

function leadingZero(value) {
  return value.toString().padStart(2, '0');
}

export function getDateParts(date = null) {
  date ??= new Date;

  return {
    year: date.getUTCFullYear(),
    month: leadingZero(date.getUTCMonth() + 1),
    day: leadingZero(date.getUTCDate()),
    hour: leadingZero(date.getUTCHours()),
    minute: leadingZero(date.getUTCMinutes()),
    second: leadingZero(date.getUTCSeconds()),
  };
}

export function getGearIcon(gear) {
  switch (gear.gear.__typename) {
    case 'HeadGear': return '🧢';
    case 'ClothingGear': return '👕';
    case 'ShoesGear': return '👟';
    default: return null;
  }
}

export function normalizeSplatnetResourcePath(url) {
  // Parse the URL
  let u = new URL(url);

  // Get just the pathname (without the host, query string, etc.)
  let result = u.pathname;

  // Remove "/resources/prod" from the beginning if it exists
  result = result.replace(/^\/resources\/prod/, '');

  // Remove the leading slash
  result = result.replace(/^\//, '');

  return result;
}

export function deriveId(node) {
  // Unfortunately, SplatNet doesn't return IDs for a lot of gear properties.
  // Derive IDs from image URLs instead.

  let path = normalizeSplatnetResourcePath(node.image.url);

  let id = bytesToHex(shake256(new TextEncoder().encode(path), { dkLen: 8 }));

  return {
    '__splatoon3ink_id': id,
    ...node,
  };
}

export function getFestId(id) {
  return Buffer.from(id, 'base64').toString().match(/^Fest-[A-Z]+:(.+)$/)?.[1] ?? id;
}

export function getFestTeamId(id) {
  return Buffer.from(id, 'base64').toString().match(/^FestTeam-[A-Z]+:((.+):(.+))$/)?.[1] ?? id;
}

export function getXRankSeasonId(id) {
  let parts = Buffer.from(id, 'base64').toString().match(/^XRankingSeason-([A-Z]+):(.+)$/i);

  return parts
    ? `${parts[1]}-${parts[2]}`
    : id;
}

/**
 * Calculate cache expiry timestamp with 5-minute buffer.
 * @param {number} expiresIn - Seconds until expiry
 * @returns {number} Timestamp to expire the cache (5 minutes early)
 */
export function calculateCacheExpiry(expiresIn) {
  let expires = Date.now() + expiresIn * 1000;

  // Expire 5min early to make sure we have time to execute requests
  return expires - 5 * 60 * 1000;
}
