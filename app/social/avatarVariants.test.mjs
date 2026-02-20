import { describe, it, expect } from 'vitest';
import { getCurrentVariant } from './avatarVariants.mjs';

// Date-only strings (YYYY-MM-DD) are parsed as UTC, which can shift the
// local date. Adding T00:00 makes them parse as local time instead.
function date(str) {
  return new Date(`${str}T00:00`);
}

describe('getCurrentVariant', () => {
  it('returns default for most of the year', () => {
    expect(getCurrentVariant(date('2026-01-15')).key).toBe('default');
    expect(getCurrentVariant(date('2026-03-01')).key).toBe('default');
    expect(getCurrentVariant(date('2026-07-04')).key).toBe('default');
    expect(getCurrentVariant(date('2026-12-25')).key).toBe('default');
  });

  it('returns pride for June', () => {
    let variant = getCurrentVariant(date('2026-06-15'));
    expect(variant.key).toBe('pride');
    expect(variant.displayName).toBe('Splatoon3.ink');
  });

  it('returns pride on boundary days', () => {
    expect(getCurrentVariant(date('2026-06-01')).key).toBe('pride');
    expect(getCurrentVariant(date('2026-07-01')).key).toBe('pride'); // padded for US timezones
  });

  it('returns default just outside pride range', () => {
    expect(getCurrentVariant(date('2026-05-31')).key).toBe('default');
    expect(getCurrentVariant(date('2026-07-02')).key).toBe('default');
  });

  it('returns halloween for October', () => {
    let variant = getCurrentVariant(date('2026-10-15'));
    expect(variant.key).toBe('halloween');
    expect(variant.displayName).toBe('Splatoon3.eek \u{1F383}');
  });

  it('returns halloween on boundary days', () => {
    expect(getCurrentVariant(date('2026-10-01')).key).toBe('halloween');
    expect(getCurrentVariant(date('2026-11-01')).key).toBe('halloween'); // padded for US timezones
  });

  it('returns default just outside halloween range', () => {
    expect(getCurrentVariant(date('2026-09-30')).key).toBe('default');
    expect(getCurrentVariant(date('2026-11-02')).key).toBe('default');
  });

  it('returns the correct avatar filename', () => {
    expect(getCurrentVariant(date('2026-01-01')).avatar).toBe('default.png');
    expect(getCurrentVariant(date('2026-06-01')).avatar).toBe('pride.png');
    expect(getCurrentVariant(date('2026-10-01')).avatar).toBe('halloween.png');
  });

  it('defaults to now when no date is provided', () => {
    let variant = getCurrentVariant();
    expect(variant).toHaveProperty('key');
    expect(variant).toHaveProperty('displayName');
    expect(variant).toHaveProperty('avatar');
  });
});
