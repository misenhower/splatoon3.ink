import { describe, expect, it } from 'vitest';
import ImageDescriptions from './ImageDescriptions.mjs';
import SocialMessages from './i18n/SocialMessages.mjs';
import english from './i18n/en-US.json' with { type: 'json' };
import japanese from './i18n/ja-JP.json' with { type: 'json' };

const now = Date.parse('2026-10-17T16:00:00Z');
const translations = {
  stages: { stage: { name: 'アラマキ砦' } },
  bosses: { boss: { name: 'ヨコヅナ' } },
  brands: { brand: { name: 'アイロニック' } },
  gear: { first: { name: 'イカヘアピン' }, second: { name: 'わかばイカＴ' } },
  powers: { power: { name: 'インク回復力アップ' } },
  festivals: {
    festival: { title: 'どちらを選ぶ？', teams: [{ teamName: 'チームA' }, { teamName: 'チームB' }] },
  },
};

function descriptions(locale = 'en-US') {
  return new ImageDescriptions(new SocialMessages(locale, translations));
}

const shift = {
  startTime: '2026-10-19T16:00:00Z',
  endTime: '2026-10-21T08:00:00Z',
  settings: {
    coopStage: { id: 'stage', name: 'Sockeye Station' },
    boss: { id: 'boss', name: 'Cohozuna' },
  },
};

function gear(id, name, hours) {
  return {
    price: 1000,
    saleEndTime: new Date(now + hours * 3600000).toISOString(),
    gear: {
      id,
      name,
      brand: { id: 'brand', name: 'Zink' },
      primaryGearPower: { id: 'power', name: 'Ink Recovery Up' },
      additionalGearPowers: [{}, {}],
    },
  };
}

describe('image descriptions', () => {
  it('adds shift timing and the upcoming boss without repeating the body’s weapon list', () => {
    expect(descriptions().shift(shift, now, { upcoming: true })).toBe(
      'Salmon Run — Sockeye Station.\nOpens in 2 days.\nKing Salmonid: Cohozuna',
    );
    expect(descriptions('ja-JP').shift(shift, now, { upcoming: true })).toBe(
      'サーモンラン：アラマキ砦。\n10/20 1:00 – 10/21 17:00 JST\nオカシラシャケ：ヨコヅナ',
    );
    expect(descriptions().shift(shift, Date.parse(shift.startTime))).toContain('40 hours remaining.');
    expect(descriptions().shift(shift, now, { eggstra: true, upcoming: true })).not.toContain('King Salmonid');
  });

  it('describes every gear card, including abilities missing from the body', () => {
    const gears = [gear('first', 'Squid Hairclip', 8), gear('second', 'Basic Tee', 4)];
    const en = descriptions().gear(gears, now);
    const jp = descriptions('ja-JP').gear(gears, now);

    expect(en).toContain('Squid Hairclip: 1000 coins; 8 hours left.');
    expect(en).toContain('Basic Tee: 1000 coins; 4 hours left. Main ability: Ink Recovery Up.');
    expect(en.match(/Main ability:/g)).toHaveLength(1);
    expect(en).toContain('Additional ability slots: 2.');
    expect(jp).toContain('わかばイカＴ：1000ゲソ、残り4時間。 基本ギアパワー：インク回復力アップ。');

    const daily = descriptions().gear(gears, now, { brand: gears[0].gear.brand });
    expect(daily).toContain('The Daily Drop — Zink.');
    expect(daily).not.toContain('Main ability:');
  });

  it('preserves result column associations and omits an unavailable Tricolor row', () => {
    const festival = {
      id: 'festival',
      title: 'Which would you choose?',
      hasResults: true,
      teams: [
        {
          teamName: 'Team A',
          result: {
            isWinner: true,
            horagaiRatio: 0.55,
            voteRatio: 0.45,
            regularContributionRatio: 0.6,
            challengeContributionRatio: 0.51,
            tricolorContributionRatio: null,
          },
        },
        {
          teamName: 'Team B',
          result: {
            isWinner: false,
            horagaiRatio: 0.45,
            voteRatio: 0.55,
            regularContributionRatio: 0.4,
            challengeContributionRatio: 0.49,
            tricolorContributionRatio: null,
          },
        },
      ],
    };
    const en = descriptions().festival(festival, { includeTheme: true });
    const jp = descriptions('ja-JP').festival(festival, { includeTheme: true });

    expect(en).toContain('Teams, left to right: Team A, Team B.');
    expect(en).toContain('Votes: Team A 45.00%, Team B 55.00%.');
    expect(en).toContain('Winner: Team A.');
    expect(en).not.toContain('Tricolor');
    expect(jp).toContain('得票率：チームA 45.00%、チームB 55.00%。');

    festival.teams[0].result.tricolorContributionRatio = 0.6;
    festival.teams[1].result.tricolorContributionRatio = 0.4;
    expect(descriptions().festival(festival)).toContain('Tricolor Battle: Team A 60.00%, Team B 40.00%.');
  });

  it.each([
    [59000, '59 seconds'],
    [60000, '1 minute'],
    [3600000, '1 hour'],
    [14400000, '4 hours'],
  ])('matches gear expiry units for %i milliseconds', (milliseconds, expected) => {
    expect(descriptions().duration(milliseconds, { seconds: true })).toBe(expected);
  });
});

function templates(catalog) {
  return Object.values(catalog).flatMap(value => typeof value === 'string' ? [value] : templates(value));
}

describe('Japanese filtering hashtags', () => {
  it('matches English post-type tags and broad-tag placement', () => {
    const en = templates(english);
    const jp = templates(japanese);

    expect(jp).toHaveLength(en.length);
    en.forEach((template, index) => {
      const tags = value => value.match(/#[^\s]+/g) ?? [];

      expect(tags(jp[index].replaceAll('#スプラトゥーン3', '#splatoon3'))).toEqual(tags(template));
    });
  });
});
