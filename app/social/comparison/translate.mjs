import glossary from './glossary.json' with { type: 'json' };
import fixtures from './fixtures.json' with { type: 'json' };

const names = { ...glossary.names };

function collectNames(value) {
  if (Array.isArray(value)) {
    value.forEach(collectNames);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const id = value.__splatoon3ink_id ?? value.id;
  if (id && value.name) {
    for (const category of ['gear', 'brands', 'powers']) {
      const japanese = fixtures['ja-JP'][category]?.[id]?.name;
      if (japanese) names[japanese] = value.name;
    }
  }
  Object.values(value).forEach(collectNames);
}

collectNames(fixtures.gear);

const phrases = Object.entries({ ...names, ...glossary.phrases })
  .sort(([a], [b]) => b.length - a.length);

// This glossary translates the fixed examples for review, not arbitrary Japanese posts.
export function translate(text, example) {
  for (const [japanese, english] of Object.entries(glossary.hashtags)) {
    text = text.replaceAll(japanese, english);
  }

  text = text
    .replace(/(.+?)で(サーモンラン|ビッグラン)開催中！/g, (_, stage, mode) =>
      `${mode === 'サーモンラン' ? 'Salmon Run' : 'Big Run'} is now open on ${stage}!`)
    .replace(/開始まであと(\d+)日！/g, 'Starts in $1 days!')
    .replace(/(\d+)ゲソ、残り(\d+)時間/g, '$1 coins; $2 hours left')
    .replace(/残り(\d+)時間/g, '$1 hours left')
    .replace(/(\d+)年(\d+)月(\d+)日/g, '$1-$2-$3');

  for (const [japanese, english] of phrases) {
    text = text.replaceAll(japanese, english);
  }
  text = text.replaceAll('チャレンジ', example.id === 'rotation' ? 'Series' : 'Pro');

  for (const [japanese, english] of Object.entries({
    '：': ': ', '（': ' (', '）': ')', '／': ' / ', '・': ' · ', '〜': '–', '、': ', ', '。': '.',
  })) {
    text = text.replaceAll(japanese, english);
  }

  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) {
    throw new Error(`Update the comparison glossary for ${example.id}: ${text}`);
  }

  return text;
}
