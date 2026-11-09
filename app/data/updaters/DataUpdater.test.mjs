import { afterEach, describe, expect, it, vi } from 'vitest';
import DataUpdater from './DataUpdater.mjs';
import { testBuckets } from '../../test/storage.mjs';

describe('DataUpdater', () => {
  describe('deriveIds', () => {
    it('replaces every recursively matched node while preserving its data', () => {
      const updater = Object.create(DataUpdater.prototype);
      updater.derivedIds = ['$..weapons.*'];
      const splattershot = {
        name: 'Splattershot',
        image: { url: 'https://example.com/assets/weapon-a.png' },
      };
      const splatRoller = {
        name: 'Splat Roller',
        image: { url: 'https://example.com/assets/weapon-b.png' },
      };
      const scheduleWeapons = [splattershot];
      const nestedWeapons = [splatRoller];
      const data = {
        schedules: [
          {
            weapons: scheduleWeapons,
          },
          {
            nested: {
              weapons: nestedWeapons,
            },
          },
        ],
      };

      updater.deriveIds(data);

      const weapons = [...scheduleWeapons, ...nestedWeapons];
      expect(weapons.map(({ name }) => name)).toEqual(['Splattershot', 'Splat Roller']);
      expect(weapons.map(({ __splatoon3ink_id: id }) => id)).toEqual([
        '1bfe00916f1f6b9a',
        '027798dcfb87596b',
      ]);
    });
  });

  describe('storage', () => {
    function makeUpdater(props = {}) {
      return Object.assign(Object.create(DataUpdater.prototype), {
        filename: 'gear',
        outputDirectory: 'data',
        archiveOnePerHour: true,
        ...props,
      });
    }

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.useRealTimers();
    });

    it('publishes data to public storage', async () => {
      await makeUpdater().saveData({ data: { a: 1 } });

      expect(testBuckets().public.json('data/gear.json')).toEqual({ data: { a: 1 } });
      expect(testBuckets().archive.objects.size).toBe(0);
    });

    it('publishes data in a subdirectory', async () => {
      await makeUpdater({ directory: 'xrank', filename: 'xrank.detail.a-1.splatzones' }).saveData({});

      expect(testBuckets().public.json('data/xrank/xrank.detail.a-1.splatzones.json')).toEqual({});
    });

    it('writes an hourly archive snapshot when ARCHIVE_DATA is set', async () => {
      vi.stubEnv('ARCHIVE_DATA', 'true');
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-08T12:34:56Z'));

      await makeUpdater().saveData({ data: { a: 1 } });

      expect([...testBuckets().archive.objects.keys()]).toEqual(['2026-11-08.12-00-00.gear.json']);
    });

    it('publishes calendars next to the data', async () => {
      let updater = makeUpdater({
        calendarName: 'Test',
        getCalendarEntries: () => [{
          id: 'fest-1',
          title: 'Splatfest',
          url: 'https://splatoon3.ink',
          imageUrl: 'https://assets.test/a.png',
          start: '2026-11-08T00:00:00Z',
          end: '2026-11-09T00:00:00Z',
        }],
      });

      await updater.updateCalendarEvents({});

      expect(testBuckets().public.text('data/gear.ics')).toContain('BEGIN:VCALENDAR');
      expect(testBuckets().public.objects.get('data/gear.ics').httpMetadata.contentType).toBe('text/calendar');
    });

    it('treats missing or stale published files as older than a cutoff', async () => {
      let updater = makeUpdater();
      let cutoff = new Date(Date.now() + 60_000);

      expect(await updater.olderThan('data/gear.json', cutoff)).toBe(true);

      await updater.saveData({});

      expect(await updater.olderThan('data/gear.json', cutoff)).toBe(true);
      expect(await updater.olderThan('data/gear.json', new Date(Date.now() - 60_000))).toBe(false);
    });
  });
});
