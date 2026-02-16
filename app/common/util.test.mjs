import { describe, it, expect } from 'vitest';
import {
  getTopOfCurrentHour,
  getDateParts,
  getGearIcon,
  normalizeSplatnetResourcePath,
  deriveId,
  getFestId,
  getFestTeamId,
  getXRankSeasonId,
  calculateCacheExpiry,
} from './util.mjs';

describe('getTopOfCurrentHour', () => {
  it('zeros out minutes, seconds, and milliseconds', () => {
    const date = new Date('2024-01-15T14:35:22.123Z');
    const result = getTopOfCurrentHour(date);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
    expect(result.getUTCHours()).toBe(14);
  });

  it('returns the mutated date object', () => {
    const date = new Date('2024-01-15T14:35:22.123Z');
    const result = getTopOfCurrentHour(date);
    expect(result).toBe(date);
  });

  it('uses current date when no argument', () => {
    const before = new Date();
    const result = getTopOfCurrentHour();
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

describe('getDateParts', () => {
  it('returns correct parts with leading zeros', () => {
    const date = new Date('2024-03-05T08:02:09.000Z');
    const parts = getDateParts(date);
    expect(parts).toEqual({
      year: 2024,
      month: '03',
      day: '05',
      hour: '08',
      minute: '02',
      second: '09',
    });
  });

  it('handles double-digit values', () => {
    const date = new Date('2024-12-25T23:59:45.000Z');
    const parts = getDateParts(date);
    expect(parts).toEqual({
      year: 2024,
      month: '12',
      day: '25',
      hour: '23',
      minute: '59',
      second: '45',
    });
  });
});

describe('getGearIcon', () => {
  it('returns cap emoji for HeadGear', () => {
    expect(getGearIcon({ gear: { __typename: 'HeadGear' } })).toBe('🧢');
  });

  it('returns shirt emoji for ClothingGear', () => {
    expect(getGearIcon({ gear: { __typename: 'ClothingGear' } })).toBe('👕');
  });

  it('returns shoe emoji for ShoesGear', () => {
    expect(getGearIcon({ gear: { __typename: 'ShoesGear' } })).toBe('👟');
  });

  it('returns null for unknown type', () => {
    expect(getGearIcon({ gear: { __typename: 'WeaponGear' } })).toBeNull();
  });
});

describe('normalizeSplatnetResourcePath', () => {
  it('strips /resources/prod prefix and leading slash', () => {
    const url = 'https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/weapon_illust/12345.png';
    expect(normalizeSplatnetResourcePath(url)).toBe('v2/weapon_illust/12345.png');
  });

  it('handles URLs without the prefix', () => {
    const url = 'https://example.com/images/test.png';
    expect(normalizeSplatnetResourcePath(url)).toBe('images/test.png');
  });

  it('strips query strings', () => {
    const url = 'https://api.lp1.av5ja.srv.nintendo.net/resources/prod/v2/image.png?ver=123';
    expect(normalizeSplatnetResourcePath(url)).toBe('v2/image.png');
  });
});

describe('deriveId', () => {
  it('produces consistent hash for the same URL', () => {
    const node = { image: { url: 'https://example.com/resources/prod/v2/test.png' }, name: 'Test' };
    const result1 = deriveId(node);
    const result2 = deriveId(node);
    expect(result1.__splatoon3ink_id).toBe(result2.__splatoon3ink_id);
  });

  it('produces different hashes for different URLs', () => {
    const node1 = { image: { url: 'https://example.com/resources/prod/v2/a.png' } };
    const node2 = { image: { url: 'https://example.com/resources/prod/v2/b.png' } };
    expect(deriveId(node1).__splatoon3ink_id).not.toBe(deriveId(node2).__splatoon3ink_id);
  });

  it('preserves original node properties', () => {
    const node = { image: { url: 'https://example.com/test.png' }, name: 'Gear', rarity: 2 };
    const result = deriveId(node);
    expect(result.name).toBe('Gear');
    expect(result.rarity).toBe(2);
    expect(result.image).toBe(node.image);
    expect(result.__splatoon3ink_id).toBeDefined();
  });
});

describe('getFestId', () => {
  it('extracts ID from base64-encoded Fest string', () => {
    const encoded = Buffer.from('Fest-US:12345').toString('base64');
    expect(getFestId(encoded)).toBe('12345');
  });

  it('handles multi-region prefix', () => {
    const encoded = Buffer.from('Fest-UJEA:99').toString('base64');
    expect(getFestId(encoded)).toBe('99');
  });

  it('returns original value on non-match', () => {
    expect(getFestId('not-base64-fest')).toBe('not-base64-fest');
  });
});

describe('getFestTeamId', () => {
  it('extracts FESTID:TEAMID from base64-encoded string', () => {
    const encoded = Buffer.from('FestTeam-US:100:3').toString('base64');
    expect(getFestTeamId(encoded)).toBe('100:3');
  });

  it('returns original value on non-match', () => {
    expect(getFestTeamId('invalid')).toBe('invalid');
  });
});

describe('getXRankSeasonId', () => {
  it('extracts REGION-ID from base64-encoded string', () => {
    const encoded = Buffer.from('XRankingSeason-US:5').toString('base64');
    expect(getXRankSeasonId(encoded)).toBe('US-5');
  });

  it('returns original value on non-match', () => {
    expect(getXRankSeasonId('invalid')).toBe('invalid');
  });
});

describe('calculateCacheExpiry', () => {
  it('returns timestamp = now + expiresIn - 5 minutes', () => {
    const before = Date.now();
    const expiresIn = 3600; // 1 hour in seconds
    const result = calculateCacheExpiry(expiresIn);
    const after = Date.now();

    const fiveMinutes = 5 * 60 * 1000;
    expect(result).toBeGreaterThanOrEqual(before + expiresIn * 1000 - fiveMinutes);
    expect(result).toBeLessThanOrEqual(after + expiresIn * 1000 - fiveMinutes);
  });
});
