import { describe, expect, it } from 'vitest';
import { LocalizationProcessor } from './LocalizationProcessor.mjs';

function makeProcessor(rulesets) {
  return new LocalizationProcessor({ code: 'en-US' }, rulesets);
}

describe('LocalizationProcessor', () => {
  describe('filename', () => {
    it('returns the correct path for the locale', () => {
      const processor = makeProcessor([]);
      expect(processor.filename).toBe('dist/data/locale/en-US.json');
    });

    it('uses the locale code', () => {
      const processor = new LocalizationProcessor({ code: 'ja-JP' }, []);
      expect(processor.filename).toBe('dist/data/locale/ja-JP.json');
    });
  });

  describe('rulesetIterations', () => {
    it('yields one entry for a simple ruleset', () => {
      const processor = makeProcessor([
        { key: 'stages', nodes: '$.stages.*', id: 'id', values: 'name' },
      ]);

      const results = [...processor.rulesetIterations()];
      expect(results).toEqual([
        { key: 'stages', node: '$.stages.*', id: 'id', value: 'name' },
      ]);
    });

    it('yields entries for multiple nodes (array)', () => {
      const processor = makeProcessor([
        { key: 'weapons', nodes: ['$.main.*', '$.sub.*'], id: 'id', values: 'name' },
      ]);

      const results = [...processor.rulesetIterations()];
      expect(results).toEqual([
        { key: 'weapons', node: '$.main.*', id: 'id', value: 'name' },
        { key: 'weapons', node: '$.sub.*', id: 'id', value: 'name' },
      ]);
    });

    it('yields entries for multiple values (array)', () => {
      const processor = makeProcessor([
        { key: 'stages', nodes: '$.stages.*', id: 'id', values: ['name', 'description'] },
      ]);

      const results = [...processor.rulesetIterations()];
      expect(results).toEqual([
        { key: 'stages', node: '$.stages.*', id: 'id', value: 'name' },
        { key: 'stages', node: '$.stages.*', id: 'id', value: 'description' },
      ]);
    });

    it('yields cartesian product for multiple nodes and values', () => {
      const processor = makeProcessor([
        { key: 'items', nodes: ['$.a.*', '$.b.*'], id: 'id', values: ['name', 'desc'] },
      ]);

      const results = [...processor.rulesetIterations()];
      expect(results).toHaveLength(4);
      expect(results).toEqual([
        { key: 'items', node: '$.a.*', id: 'id', value: 'name' },
        { key: 'items', node: '$.a.*', id: 'id', value: 'desc' },
        { key: 'items', node: '$.b.*', id: 'id', value: 'name' },
        { key: 'items', node: '$.b.*', id: 'id', value: 'desc' },
      ]);
    });

    it('yields entries across multiple rulesets', () => {
      const processor = makeProcessor([
        { key: 'stages', nodes: '$.stages.*', id: 'id', values: 'name' },
        { key: 'weapons', nodes: '$.weapons.*', id: 'id', values: 'name' },
      ]);

      const results = [...processor.rulesetIterations()];
      expect(results).toHaveLength(2);
      expect(results[0].key).toBe('stages');
      expect(results[1].key).toBe('weapons');
    });
  });

  describe('dataIterations', () => {
    it('yields entries with correct id, value, and path', () => {
      const processor = makeProcessor([
        { key: 'stages', nodes: '$.stages[*]', id: 'id', values: 'name' },
      ]);

      const data = {
        stages: [
          { id: 'stage-1', name: 'Scorch Gorge' },
          { id: 'stage-2', name: 'Eeltail Alley' },
        ],
      };

      const results = [...processor.dataIterations(data)];
      expect(results).toHaveLength(2);

      expect(results[0].id).toBe('stage-1');
      expect(results[0].value).toBe('Scorch Gorge');
      expect(results[0].path).toBe('stages.stage-1.name');

      expect(results[1].id).toBe('stage-2');
      expect(results[1].value).toBe('Eeltail Alley');
      expect(results[1].path).toBe('stages.stage-2.name');
    });

    it('skips null nodes from jsonpath results', () => {
      const processor = makeProcessor([
        { key: 'items', nodes: '$.items[*]', id: 'id', values: 'name' },
      ]);

      const data = {
        items: [null, { id: 'item-1', name: 'Test' }, null],
      };

      const results = [...processor.dataIterations(data)];
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('item-1');
    });

    it('handles nested id paths via lodash get', () => {
      const processor = makeProcessor([
        { key: 'gear', nodes: '$.gear[*]', id: 'meta.id', values: 'meta.name' },
      ]);

      const data = {
        gear: [{ meta: { id: 'g-1', name: 'Splat Helmet' } }],
      };

      const results = [...processor.dataIterations(data)];
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('g-1');
      expect(results[0].value).toBe('Splat Helmet');
      expect(results[0].path).toBe('gear.g-1.meta.name');
    });

    it('returns empty for non-matching jsonpath', () => {
      const processor = makeProcessor([
        { key: 'stages', nodes: '$.nonexistent[*]', id: 'id', values: 'name' },
      ]);

      const results = [...processor.dataIterations({})];
      expect(results).toHaveLength(0);
    });
  });
});
