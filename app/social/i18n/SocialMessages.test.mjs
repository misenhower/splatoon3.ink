import { describe, expect, it } from 'vitest';
import SocialMessages from './SocialMessages.mjs';
import StatusGenerator from '../generators/StatusGenerator.mjs';
import SplatfestStatus from '../generators/SplatfestStatus.mjs';
import SplatfestResultsStatus from '../generators/SplatfestResultsStatus.mjs';

describe('SocialMessages', () => {
  it('inserts game names as plain text without interpreting their contents', () => {
    const messages = new SocialMessages;

    expect(messages.text('gear.item', {
      icon: '🧢',
      name: 'A&B <帽子> {power} $&',
      power: 'Ink Saver (Main)',
    })).toBe('🧢 A&B <帽子> {power} $& with Ink Saver (Main)');
  });

  it('rejects unsupported locales instead of silently posting in English', () => {
    expect(() => new SocialMessages('fr-FR')).toThrow('Unsupported social locale: fr-FR');
  });

  it('rejects missing templates and interpolation parameters', () => {
    const messages = new SocialMessages;

    expect(() => messages.text('missing')).toThrow('Missing social message: en-US.missing');
    expect(() => messages.text('gear.item', { name: 'Cap' })).toThrow('Missing parameter icon');
  });

  it.each([
    () => new StatusGenerator({ locale: 'en-US' }),
    () => new SplatfestStatus('JP', { locale: 'en-US' }),
    () => new SplatfestResultsStatus('JP', { locale: 'en-US' }),
  ])('accepts an explicit generator locale', makeGenerator => {
    const generator = makeGenerator();

    expect(generator.locale).toBe('en-US');
    expect(generator.t('schedule.rotation')).toBe('Splatoon 3 map rotation: #maprotation');
  });

  it('defaults to English and preserves the existing delivery cache key', () => {
    const generator = new SplatfestStatus('JP');

    expect(generator.locale).toBe('en-US');
    expect(generator.lastPostCache({ key: 'bluesky' }).path).toBe('storage/cache/social.bluesky.splatfest.JP.json');
  });
});
