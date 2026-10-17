import { describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from '../../../src/stores/time.mjs';
import SchedulesStatus from './SchedulesStatus.mjs';
import SalmonRunStatus from './SalmonRunStatus.mjs';
import SalmonRunUpcomingStatus from './SalmonRunUpcomingStatus.mjs';
import EggstraWorkStatus from './EggstraWorkStatus.mjs';
import EggstraWorkUpcomingStatus from './EggstraWorkUpcomingStatus.mjs';
import DailyDropGearStatus from './DailyDropGearStatus.mjs';
import RegularGearStatus from './RegularGearStatus.mjs';
import ChallengeStatus from './ChallengeStatus.mjs';
import SplatfestStatus from './SplatfestStatus.mjs';
import SplatfestResultsStatus from './SplatfestResultsStatus.mjs';
import SocialMessages, { MissingTranslationError } from '../i18n/SocialMessages.mjs';

vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn() }),
}));

const translations = {
  stages: { stage: { name: 'ユノハナ大渓谷' }, coop: { name: 'アラマキ砦' } },
  rules: { rule: { name: 'ガチエリア' } },
  weapons: { weapon: { name: 'スプラシューター' } },
  bosses: { boss: { name: 'ヨコヅナ' } },
  gear: { gear: { name: 'イカヘアピン' } },
  powers: { power: { name: 'インク効率アップ（メイン）' } },
  brands: { brand: { name: 'アイロニック' } },
  events: { event: { name: 'イベント名', desc: '説明', regulation: 'ルール1<br />ルール2' } },
  festivals: { festival: { title: 'どちらを選ぶ？', teams: [{ teamName: 'チーム名' }] } },
};
const options = { locale: 'ja-JP', translations };
const node = id => ({ id, name: `English ${id}` });
const schedule = {
  startTime: '2026-10-17T14:00:00Z',
  endTime: '2026-10-17T16:00:00Z',
  activeTimePeriod: { startTime: '2026-10-17T14:00:00Z', endTime: '2026-10-17T16:00:00Z' },
  settings: {
    vsRule: node('rule'),
    vsStages: [node('stage'), node('stage')],
    coopStage: node('coop'),
    weapons: Array.from({ length: 4 }, () => ({ ...node('weapon'), __splatoon3ink_id: 'weapon' })),
    boss: node('boss'),
    leagueMatchEvent: { ...node('event'), desc: 'English description', regulation: 'English rules' },
  },
};
const gear = {
  price: 1000,
  saleEndTime: schedule.endTime,
  gear: {
    ...node('gear'),
    __splatoon3ink_id: 'gear',
    __typename: 'HeadGear',
    primaryGearPower: { ...node('power'), __splatoon3ink_id: 'power' },
    brand: node('brand'),
    additionalGearPowers: [node('power')],
  },
};
const festival = {
  ...node('festival'),
  __splatoon3ink_id: 'festival',
  title: 'English theme',
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  regions: ['NA', 'JP', 'EU', 'AP'],
  hasResults: true,
  teams: [{ teamName: 'English team', result: { isWinner: true } }],
};

async function generate(generator) {
  setActivePinia(createPinia());
  useTimeStore().setNow(Date.parse('2026-10-16T00:00:00Z'));
  vi.spyOn(generator, '_prepareScreenshotHelper').mockResolvedValue();

  const status = await generator.getStatus({ capture: vi.fn().mockResolvedValue(Buffer.from('image')) });

  expect(status.locale).toBe('ja-JP');
  expect(status.status.trim()).not.toBe('');

  return status;
}

describe('Japanese social output', () => {
  it('uses Japanese game names without adding dates to rotation announcements', async () => {
    const generator = new SchedulesStatus(options);
    vi.spyOn(generator, 'getStages').mockResolvedValue({
      regular: schedule,
      anarchySeries: schedule,
      anarchyOpen: schedule,
      xMatch: schedule,
    });

    const status = await generate(generator);

    expect(status.status).toContain('ステージ情報\n#ステージ情報');
    expect(status.status).not.toContain('10/17');
    expect(status.status).toContain('バンカラ（チャレンジ）：ガチエリア');
    expect(status.media[0].altText).toContain('ユノハナ大渓谷');
    expect(status.status).not.toContain('English');
    expect(status.locale).toBe('ja-JP');
  });

  it.each([
    { label: 'regular', flags: {} },
    { label: 'Big Run', flags: { isBigRun: true } },
    { label: 'random', flags: { isMystery: true } },
    { label: 'Grizzco', flags: { isGrizzcoMystery: true } },
  ])('localizes a $label shift without mutating game data', async ({ flags }) => {
    const data = structuredClone({ ...schedule, ...flags });
    const before = structuredClone(data);
    const generator = new SalmonRunStatus(options);
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(data);

    const status = await generate(generator);

    expect(status.status).toContain('アラマキ砦');
    expect(status.status).toContain('ヨコヅナ');
    expect(status.status).toContain('スプラシューター');
    expect(status.status).toContain('開催中！');
    expect(status.status).not.toContain('10/17');
    expect(status.media[0].altText).toContain('10/17 23:00 – 10/18 1:00 JST');
    expect(status.media[0].altText).not.toContain('スプラシューター');
    expect(status.media[0].altText).not.toContain('#');
    expect(data).toEqual(before);
  });

  it.each([SalmonRunUpcomingStatus, EggstraWorkUpcomingStatus])('counts down to upcoming shifts', async Generator => {
    const generator = new Generator(options);
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue({ ...schedule, isMystery: true });

    const status = await generate(generator);

    expect(status.status).toContain('開始まであと2日！');
    expect(status.status).not.toContain('10/17');
    expect(status.status).not.toContain('English');
  });

  it('localizes active Eggstra Work', async () => {
    const generator = new EggstraWorkStatus(options);
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(schedule);

    expect((await generate(generator)).status).toContain('バイトチームコンテスト開催中！\nアラマキ砦');
  });

  it('localizes daily and regular gear', async () => {
    const daily = new DailyDropGearStatus(options);
    vi.spyOn(daily, 'getData').mockResolvedValue({ brand: { brand: node('brand') }, gears: [gear] });
    const regular = new RegularGearStatus(options);
    vi.spyOn(regular, 'getGears').mockResolvedValue([gear]);

    expect((await generate(daily)).status).toContain('アイロニック');
    expect((await generate(regular)).status).toContain('イカヘアピン（インク効率アップ（メイン））');
  });

  it('keeps exact JST challenge times, including periods crossing midnight', async () => {
    const generator = new ChallengeStatus(options);
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(schedule);

    const status = await generate(generator);

    expect(status.status).toContain('イベント名');
    expect(status.status).toContain('10/17 23:00〜10/18 1:00（日本時間）');
    expect(status.media[0].altText).toBe('ルール1\nルール2');
  });

  it.each(['upcoming', 'upcoming:3d', 'upcoming:1d', 'active', 'ended'])('localizes a global festival: %s', async state => {
    const generator = new SplatfestStatus('NA', options);
    vi.spyOn(generator, 'getFestival').mockResolvedValue(festival);
    vi.spyOn(generator, 'getState').mockResolvedValue(state);

    const status = await generate(generator);

    expect(status.status).not.toContain('English');
    expect(status.status).not.toContain('10/17');
    if (state !== 'ended') {
      expect(status.status).toContain('どちらを選ぶ？');
    }

    if (state === 'upcoming:3d') expect(status.status).toContain('フェス開催まであと3日！');
    if (state === 'upcoming:1d') expect(status.status).toContain('フェス開催まであと24時間！');
    if (state === 'active') expect(status.status).toContain('フェス開催中！');
  });

  it('localizes winning team names and the results wrapper', async () => {
    const generator = new SplatfestResultsStatus('NA', options);
    vi.spyOn(generator, 'getFestival').mockResolvedValue(festival);

    const status = await generate(generator);

    expect(status.status).toContain('「チーム名」チームの勝利');
    expect(status.contentWrapper).toBe('どちらを選ぶ？ フェスの結果');
  });

  it('defers incomplete translations instead of falling back to English', () => {
    const messages = new SocialMessages('ja-JP', {});

    expect(() => messages.game('stages', node('stage'))).toThrow(MissingTranslationError);
  });
});
