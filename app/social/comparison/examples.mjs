import fixtures from './fixtures.json' with { type: 'json' };

const now = Date.parse('2026-10-17T16:00:00Z');
const day = 86400000;
const iso = value => new Date(value).toISOString().replace('.000Z', 'Z');

export const examples = [
  { id: 'rotation', title: 'Stage rotation', key: 'schedules' },
  { id: 'fest-rotation', title: 'Splatfest rotation (one tricolor stage)', key: 'schedules', festRotation: 1 },
  {
    id: 'fest-rotation-two',
    title: 'Splatfest rotation (two tricolor stages)',
    key: 'schedules',
    festRotation: 2,
  },
  { id: 'daily', title: 'Daily Drop', key: 'gear.dailydrop' },
  { id: 'gear', title: 'Regular gear', key: 'gear.regular' },
  { id: 'challenge', title: 'Challenge opens', key: 'challenge', time: Date.parse('2026-10-23T02:00:00Z') },
  { id: 'salmon', title: 'Salmon Run opens', key: 'salmonrun', shift: 'regular' },
  { id: 'mystery', title: 'Salmon Run opens with mystery weapons', key: 'salmonrun', shift: 'mystery' },
  { id: 'grizzco', title: 'Salmon Run opens with Grizzco mystery weapons', key: 'salmonrun', shift: 'grizzco' },
  { id: 'bigrun', title: 'Big Run opens', key: 'salmonrun', shift: 'bigrun' },
  {
    id: 'upcoming-mystery',
    title: 'Upcoming mystery-weapon shift',
    key: 'salmonrun.upcoming',
    shift: 'mystery',
    upcoming: true,
  },
  {
    id: 'upcoming-grizzco',
    title: 'Upcoming Grizzco mystery shift',
    key: 'salmonrun.upcoming',
    shift: 'grizzco',
    upcoming: true,
  },
  { id: 'upcoming-bigrun', title: 'Upcoming Big Run', key: 'salmonrun.upcoming', shift: 'bigrun', upcoming: true },
  { id: 'eggstra', title: 'Eggstra Work opens', key: 'eggstrawork', shift: 'eggstra' },
  {
    id: 'upcoming-eggstra',
    title: 'Upcoming Eggstra Work',
    key: 'eggstrawork.upcoming',
    shift: 'eggstra',
    upcoming: true,
  },
  { id: 'fest-voting', title: 'Splatfest voting opens', key: 'splatfest.NA', festival: 'upcoming' },
  { id: 'fest-3d', title: 'Splatfest: 3 days to go', key: 'splatfest.NA', festival: 'upcoming:3d' },
  { id: 'fest-1d', title: 'Splatfest: 24 hours to go', key: 'splatfest.NA', festival: 'upcoming:1d' },
  { id: 'fest-open', title: 'Splatfest opens', key: 'splatfest.NA', festival: 'active' },
  { id: 'fest-end', title: 'Splatfest ends', key: 'splatfest.NA', festival: 'ended' },
  { id: 'fest-results', title: 'Splatfest results', key: 'splatfestResults.NA', festival: 'results' },
];

export function createExample(entry) {
  const time = entry.time ?? now;
  const schedules = structuredClone(fixtures.schedules);
  const festivals = Object.fromEntries(['US', 'EU', 'JP', 'AP'].map(region => [
    region, { data: { festRecords: { nodes: [structuredClone(fixtures.festival)] } } },
  ]));
  const data = schedules.data;

  if (entry.shift) {
    const grouping = data.coopGroupingSchedule;
    const shift = structuredClone(grouping.regularSchedules.nodes[0]);
    shift.startTime = iso(entry.upcoming ? time + 2 * day : time);
    shift.endTime = iso(Date.parse(shift.startTime) + 40 * 3600000);

    if (!['mystery', 'grizzco'].includes(entry.shift)) {
      shift.setting.weapons[3] = structuredClone(grouping.regularSchedules.nodes[1].setting.weapons[0]);
    }

    if (entry.shift === 'grizzco') {
      shift.setting.weapons = Array.from({ length: 4 }, () => ({
        ...structuredClone(shift.setting.weapons[3]),
        __splatoon3ink_id: '747937841598fff7',
      }));
    }

    if (entry.shift === 'bigrun') {
      shift.setting.coopStage = {
        ...structuredClone(data.regularSchedules.nodes[0].regularMatchSetting.vsStages[0]),
        id: 'Q29vcFN0YWdlLTEwNQ==',
        thumbnailImage: structuredClone(data.regularSchedules.nodes[0].regularMatchSetting.vsStages[0].image),
      };
    }

    grouping.regularSchedules.nodes = [];
    grouping.bigRunSchedules.nodes = [];
    grouping.teamContestSchedules.nodes = [];
    const type = entry.shift === 'bigrun' ? 'bigRunSchedules'
      : entry.shift === 'eggstra' ? 'teamContestSchedules' : 'regularSchedules';
    grouping[type].nodes = [shift];
  }

  if (entry.festival || entry.festRotation) {
    const offsets = {
      upcoming: 7 * day,
      'upcoming:3d': 3 * day,
      'upcoming:1d': day,
      active: 0,
      ended: -2 * day,
      results: -2 * day - 7200000,
    };
    const start = time + (entry.festRotation ? -day : offsets[entry.festival]);

    for (const region of Object.values(festivals)) {
      const fest = region.data.festRecords.nodes[0];
      fest.startTime = iso(start);
      fest.endTime = iso(start + 2 * day);

      if (entry.festival !== 'results') {
        for (const team of fest.teams) team.result = null;
      }
      region.data.festRecords.nodes = [fest];
    }

    if (entry.festRotation) {
      const setting = data.regularSchedules.nodes[0].regularMatchSetting;
      const proStages = data.bankaraSchedules.nodes[0].bankaraMatchSettings[0].vsStages;
      data.festSchedules.nodes = [{
        startTime: iso(time),
        endTime: iso(time + 7200000),
        festMatchSettings: [
          { ...structuredClone(setting), festMode: 'REGULAR' },
          { ...structuredClone(setting), vsStages: structuredClone(proStages), festMode: 'CHALLENGE' },
        ],
      }];
      const tricolorStages = structuredClone(proStages.slice(0, entry.festRotation));
      data.currentFest = {
        ...structuredClone(festivals.US.data.festRecords.nodes[0]),
        midtermTime: iso(time),
        tricolorStages,
      };
    }
  }

  return {
    ...entry,
    time,
    data: {
      schedules,
      festivals,
      gear: structuredClone(fixtures.gear),
      coop: { data: {} },
    },
    translations: {
      'en-US': structuredClone(fixtures['en-US']),
      'ja-JP': structuredClone(fixtures['ja-JP']),
    },
  };
}
