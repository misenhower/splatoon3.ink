import { readFile } from 'node:fs/promises';

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;',
  })[character]);
}

function fields(record) {
  return [
    ['body', 'Post body'],
    ['alt', 'Alt text'],
    ['screenshotText', 'Screenshot text, including footer'],
  ].map(([key, label]) => `
    <h4>${label}</h4>
    <pre>${escape(record[key] || 'No alt text is supplied.')}</pre>
  `).join('');
}

function screenshot(record, label) {
  return `<a href="${escape(record.image)}" target="_blank" rel="noopener">
    <img loading="lazy" src="${escape(record.image)}" alt="${escape(label)}">
  </a>`;
}

export async function renderComparison(examples) {
  const styles = await readFile(new URL('./style.css', import.meta.url), 'utf8');
  const navigation = examples.map((example, index) =>
    `<a href="#${escape(example.id)}">${index + 1}. ${escape(example.title)}</a>`).join('\n');
  const sections = examples.map((example, index) => {
    const english = example.locales['en-US'];
    const japanese = example.locales['ja-JP'];

    return `<section id="${escape(example.id)}">
      <h2><span>${String(index + 1).padStart(2, '0')}</span> ${escape(example.title)}</h2>
      <div class="columns">
        <article>
          <h3>English</h3>
          ${screenshot(english, `English ${example.title} preview`)}
          ${fields(english)}
        </article>
        <article>
          <h3>Japanese · translated into English</h3>
          ${screenshot(japanese, `Japanese ${example.title} preview`)}
          ${fields(example.translated)}
          <details>
            <summary>Original Japanese text</summary>
            ${fields(japanese)}
          </details>
        </article>
      </div>
    </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Social post comparison</title>
  <style>${styles}</style>
</head>
<body>
  <header>
    <h1>Social post comparison</h1>
    <p>Illustrative examples. Japanese text and hashtags are translated into English; screenshots show the originals.</p>
    <nav aria-label="Post types">${navigation}</nav>
  </header>
  <main>${sections}</main>
</body>
</html>`;
}
