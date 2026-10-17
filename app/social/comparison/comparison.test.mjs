import { describe, expect, it, vi } from 'vitest';
import { examples, createExample } from './examples.mjs';
import { exampleGenerator, exampleResponses } from './generate.mjs';
import { translate } from './translate.mjs';
import { renderComparison } from './render.mjs';
import StatusGenerator from '../generators/StatusGenerator.mjs';

vi.mock('../../common/prefixedConsole.mjs', () => ({
  default: () => ({ log: vi.fn() }),
}));

describe('reproducible social comparison', () => {
  it.each(examples)('generates $id in both languages without loading live data', async entry => {
    const liveData = vi.spyOn(StatusGenerator.prototype, '_loadData')
      .mockRejectedValue(new Error('Comparison must use its fixtures'));
    const example = createExample(entry);

    try {
      for (const locale of ['en-US', 'ja-JP']) {
        const generator = exampleGenerator(example, locale);
        const status = await generator.getStatus({ capture: vi.fn().mockResolvedValue(Buffer.from('preview')) });

        expect(status.status).toBeTruthy();
        expect(status.media).toHaveLength(1);
        expect(status.media[0].altText).toBeTruthy();
        expect(status.media[0].altText).not.toMatch(/undefined|NaN/);

        if (locale === 'ja-JP') {
          expect(translate(status.status, entry)).not.toMatch(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
          expect(translate(status.media[0].altText, entry)).toBeTruthy();
        }
      }
      expect(liveData).not.toHaveBeenCalled();
    } finally {
      liveData.mockRestore();
    }
  });

  it('creates isolated data for each example and supplies every browser data endpoint', () => {
    const first = createExample(examples[0]);
    const second = createExample(examples[0]);
    const responses = exampleResponses(first);

    expect(first).toEqual(second);
    first.data.schedules.data.regularSchedules.nodes.length = 0;
    expect(second.data.schedules.data.regularSchedules.nodes).toHaveLength(1);
    expect(Object.keys(responses).sort()).toEqual([
      '/data/coop.json',
      '/data/festivals.json',
      '/data/gear.json',
      '/data/locale/en-US.json',
      '/data/locale/ja-JP.json',
      '/data/schedules.json',
    ]);
  });

  it('fails visibly when a Japanese wording change needs a glossary update', () => {
    expect(() => translate('未知の文章', examples[0])).toThrow('Update the comparison glossary');
  });

  it('renders screenshots inline and escapes post content', async () => {
    const record = {
      body: '<script>alert("example")</script>',
      alt: 'A & B',
      screenshotText: 'Visible text',
      image: 'rotation.png',
    };
    const html = await renderComparison([{
      id: 'rotation',
      title: 'Stage rotation',
      locales: { 'en-US': record, 'ja-JP': record },
      translated: record,
    }]);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html.indexOf('<img ')).toBeLessThan(html.indexOf('<details>'));
    expect(html).not.toContain('<table>');
  });
});
