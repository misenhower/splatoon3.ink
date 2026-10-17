import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTimeStore } from '../../../src/stores/time.mjs';
import SchedulesStatus from './SchedulesStatus.mjs';
import DailyDropGearStatus from './DailyDropGearStatus.mjs';
import RegularGearStatus from './RegularGearStatus.mjs';
import ChallengeStatus from './ChallengeStatus.mjs';
import SalmonRunStatus from './SalmonRunStatus.mjs';
import SalmonRunUpcomingStatus from './SalmonRunUpcomingStatus.mjs';
import EggstraWorkStatus from './EggstraWorkStatus.mjs';
import EggstraWorkUpcomingStatus from './EggstraWorkUpcomingStatus.mjs';
import SplatfestStatus from './SplatfestStatus.mjs';
import SplatfestResultsStatus from './SplatfestResultsStatus.mjs';

vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn() }),
}));

const now = Date.parse('2026-10-17T00:00:00Z');
const hour = 60 * 60 * 1000;

function battle(rule) {
  return {
    settings: {
      vsRule: { name: rule },
      vsStages: [{ name: 'Scorch Gorge' }, { name: 'Eeltail Alley' }],
    },
  };
}

function shift(hours = 0, flags = {}) {
  return {
    startTime: new Date(now + hours * hour).toISOString(),
    ...flags,
    settings: {
      coopStage: { name: 'Sockeye Station' },
      boss: { name: 'Cohozuna' },
      weapons: ['Splattershot', 'Splat Roller', 'Splat Charger', 'Slosher'].map(name => ({ name })),
    },
  };
}

function gear(type, name, power) {
  return {
    gear: {
      __typename: type,
      name,
      primaryGearPower: { name: power },
    },
  };
}

function festival(regions) {
  return {
    title: 'Which would you choose?',
    regions,
    hasResults: true,
    teams: [
      { teamName: 'Team One', result: { isWinner: false } },
      { teamName: 'Team Two', result: { isWinner: true } },
    ],
  };
}

async function output(generator) {
  vi.spyOn(generator, '_prepareScreenshotHelper').mockResolvedValue();
  const screenshot = { capture: vi.fn().mockResolvedValue(Buffer.from('image')) };
  const status = await generator.getStatus(screenshot);

  return {
    text: status.status,
    wrapper: status.contentWrapper,
    alt: status.media.map(media => media.altText),
    captures: screenshot.capture.mock.calls,
  };
}

describe('English social output', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useTimeStore().setNow(now);
  });

  it('renders the regular battle rotation and its alt text', async () => {
    const generator = new SchedulesStatus;
    vi.spyOn(generator, 'getStages').mockResolvedValue({
      regular: battle('Turf War'),
      anarchySeries: battle('Splat Zones'),
      anarchyOpen: battle('Tower Control'),
      xMatch: battle('Rainmaker'),
    });

    expect(await output(generator)).toMatchSnapshot();
  });

  it.each([
    { label: 'no tricolor', tricolor: null },
    {
      label: 'legacy tricolor',
      tricolor: {
        isTricolorActive: true,
        tricolorStage: { name: 'Hammerhead Bridge' },
      },
    },
    {
      label: 'one tricolor stage',
      tricolor: {
        isTricolorActive: true,
        tricolorStages: [{ name: 'Hammerhead Bridge' }],
      },
    },
    {
      label: 'two tricolor stages',
      tricolor: {
        isTricolorActive: true,
        tricolorStages: [{ name: 'Hammerhead Bridge' }, { name: 'MakoMart' }],
      },
    },
  ])('renders a Splatfest rotation with $label', async ({ tricolor }) => {
    const generator = new SchedulesStatus;
    vi.spyOn(generator, 'getStages').mockResolvedValue({
      splatfestOpen: battle('Turf War'),
      splatfestPro: battle('Turf War'),
      tricolor,
    });

    expect(await output(generator)).toMatchSnapshot();
  });

  it('renders the daily brand and all gear types', async () => {
    const generator = new DailyDropGearStatus;
    vi.spyOn(generator, 'getData').mockResolvedValue({
      brand: { brand: { name: 'Zink' } },
      gears: [
        gear('HeadGear', 'Squid Hairclip', 'Ink Saver (Main)'),
        gear('ClothingGear', 'Basic Tee', 'Quick Respawn'),
        gear('ShoesGear', 'Blue Lo-Tops', 'Ink Resistance Up'),
      ],
    });

    expect(await output(generator)).toMatchSnapshot();
  });

  it('renders a regular gear sale', async () => {
    const generator = new RegularGearStatus;
    vi.spyOn(generator, 'getLatestGear').mockResolvedValue(gear('HeadGear', 'Squid Hairclip', 'Ink Saver (Main)'));

    expect(await output(generator)).toMatchSnapshot();
  });

  it('renders a challenge with line breaks in the description and regulations', async () => {
    const generator = new ChallengeStatus;
    const schedule = battle('Rainmaker');
    schedule.settings.leagueMatchEvent = {
      name: 'Challenge<br />Name',
      desc: 'First line<br />Second line',
      regulation: 'Rule one<br />Rule two',
    };
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(schedule);

    expect(await output(generator)).toMatchSnapshot();
  });

  it.each([
    { label: 'regular', flags: {} },
    { label: 'Big Run', flags: { isBigRun: true } },
    { label: 'mystery', flags: { isMystery: true } },
    { label: 'Grizzco mystery', flags: { isMystery: true, isGrizzcoMystery: true } },
    { label: 'Big Run mystery', flags: { isBigRun: true, isMystery: true } },
    { label: 'Big Run Grizzco mystery', flags: { isBigRun: true, isGrizzcoMystery: true } },
  ])('renders an active $label shift', async ({ flags }) => {
    const generator = new SalmonRunStatus;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(shift(0, flags));

    expect(await output(generator)).toMatchSnapshot();
  });

  it('omits the king when it is unknown', async () => {
    const generator = new SalmonRunStatus;
    const schedule = shift();
    delete schedule.settings.boss;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(schedule);

    expect(await output(generator)).toMatchSnapshot();
  });

  it.each([
    { label: 'Big Run', flags: { isBigRun: true } },
    { label: 'mystery', flags: { isMystery: true } },
    { label: 'Grizzco mystery', flags: { isGrizzcoMystery: true } },
  ])('renders an upcoming $label shift', async ({ flags }) => {
    const generator = new SalmonRunUpcomingStatus;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(shift(48, flags));

    expect(await output(generator)).toMatchSnapshot();
  });

  it.each([1, 5, 24, 36])('formats a shift %i hours away', async hours => {
    const generator = new SalmonRunUpcomingStatus;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(shift(hours, { isMystery: true }));

    expect(await output(generator)).toMatchSnapshot();
  });

  it('renders active Eggstra Work', async () => {
    const generator = new EggstraWorkStatus;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(shift());

    expect(await output(generator)).toMatchSnapshot();
  });

  it.each([1, 5, 24, 48])('renders Eggstra Work %i hours away', async hours => {
    const generator = new EggstraWorkUpcomingStatus;
    vi.spyOn(generator, 'getActiveSchedule').mockResolvedValue(shift(hours));

    expect(await output(generator)).toMatchSnapshot();
  });

  describe.each([
    { label: 'global', regions: ['NA', 'JP', 'EU', 'AP'] },
    { label: 'regional', regions: ['JP'] },
  ])('$label Splatfest', ({ regions }) => {
    it.each(['upcoming', 'upcoming:3d', 'upcoming:1d', 'active', 'ended'])('renders %s', async state => {
      const generator = new SplatfestStatus('JP');
      vi.spyOn(generator, 'getFestival').mockResolvedValue(festival(regions));
      vi.spyOn(generator, 'getState').mockResolvedValue(state);

      expect(await output(generator)).toMatchSnapshot();
    });

    it('renders results and their content wrapper', async () => {
      const generator = new SplatfestResultsStatus('JP');
      vi.spyOn(generator, 'getFestival').mockResolvedValue(festival(regions));

      expect(await output(generator)).toMatchSnapshot();
    });
  });
});
