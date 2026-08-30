import { describe, expect, it } from 'vitest';
import DataUpdater from './DataUpdater.mjs';

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
});
