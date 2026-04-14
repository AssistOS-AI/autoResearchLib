import { escapeHtml } from '../../src/reporting/tabular.mjs';

function citationId(label) {
  return `ref-${label.toLowerCase()}`;
}

function collectUsedCitationKeys(markdown, references) {
  const matches = markdown.match(/\[([A-Z0-9-]+)\]/g) ?? [];

  return [...new Set(matches.map((match) => match.slice(1, -1)).filter((key) => references[key]))];
}

function renderInline(text, references) {
  const codeSegments = [];
  const maskedText = text.trim().replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `@@CODE${codeSegments.length}@@`;
    codeSegments.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });
  let html = escapeHtml(maskedText);

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([A-Z0-9-]+)\]/g, (match, label) => {
    if (!references[label]) {
      return match;
    }

    return `<a class="citation" href="#${citationId(label)}">[${label}]</a>`;
  });

  return codeSegments.reduce(
    (result, segment, index) => result.replace(`@@CODE${index}@@`, segment),
    html
  );
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(lines, references) {
  const filtered = lines.filter((line) => !/^\|\s*---/.test(line));
  const rows = filtered.map(parseTableRow);
  const [header, ...body] = rows;

  return `<table><thead><tr>${header
    .map((cell) => `<th>${renderInline(cell, references)}</th>`)
    .join('')}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell, references)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function renderImage(line, references, captionLine = null) {
  const match = line.match(/^!\[(.*)\]\((.*)\)$/);

  if (!match) {
    return null;
  }

  const [, alt, src] = match;
  const caption = captionLine && /^\*.+\*$/.test(captionLine.trim())
    ? captionLine.trim().slice(1, -1)
    : null;

  return {
    html: `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />${caption ? `<figcaption>${renderInline(caption, references)}</figcaption>` : ''}</figure>`,
    consumedNextLine: Boolean(caption)
  };
}

function renderCodeBlock(lines) {
  return `<pre><code>${escapeHtml(lines.join('\n'))}</code></pre>`;
}

function renderMarkdown(markdown, references) {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(renderCodeBlock(codeLines));
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      const [, hashes, text] = line.match(/^(#{1,4})\s+(.*)$/);
      const level = Math.min(4, hashes.length + 1);
      blocks.push(`<h${level}>${renderInline(text, references)}</h${level}>`);
      index += 1;
      continue;
    }

    const imageBlock = renderImage(line, references, lines[index + 1]);

    if (imageBlock) {
      blocks.push(imageBlock.html);
      index += imageBlock.consumedNextLine ? 2 : 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines = [];

      while (index < lines.length && lines[index].trim().startsWith('|')) {
        tableLines.push(lines[index]);
        index += 1;
      }

      blocks.push(renderTable(tableLines, references));
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const listItems = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        listItems.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push(`<ol>${listItems.map((item) => `<li>${renderInline(item, references)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraphLines = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith('```') &&
      !/^#{1,4}\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('|') &&
      !/^!\[.*\]\(.*\)$/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(`<p>${renderInline(paragraphLines.join(' '), references)}</p>`);
  }

  return blocks.join('\n');
}

function articleCss() {
  return `
    :root {
      color-scheme: light;
      --text: #111827;
      --muted: #4b5563;
      --border: #d1d5db;
      --surface: #ffffff;
      --surface-alt: #f8fafc;
      --accent: #1d4ed8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2ff;
      color: var(--text);
      font: 16px/1.7 Georgia, "Times New Roman", serif;
    }
    main {
      max-width: 1024px;
      margin: 0 auto;
      background: var(--surface);
      padding: 52px 60px 72px;
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.1);
    }
    h1, h2, h3, h4 {
      line-height: 1.25;
      margin: 0 0 16px;
    }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    h2 {
      font-size: 1.65rem;
      margin-top: 44px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }
    h3 {
      font-size: 1.2rem;
      margin-top: 30px;
    }
    p, table, figure, ol, pre { margin: 0 0 20px; }
    .lead { color: var(--muted); font-size: 1.08rem; }
    .toc {
      margin: 30px 0 36px;
      padding: 18px 22px;
      border: 1px solid var(--border);
      background: var(--surface-alt);
    }
    .toc ol { margin: 0; padding-left: 20px; }
    .toc a, .citation { color: var(--accent); text-decoration: none; }
    .toc a:hover, .citation:hover { text-decoration: underline; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #dbeafe;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.93em;
    }
    pre {
      padding: 16px 18px;
      overflow-x: hidden;
      border: 1px solid var(--border);
      background: #f8fafc;
    }
    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.92rem;
      line-height: 1.6;
      display: block;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: normal;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.97rem;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    th { background: var(--surface-alt); }
    figure {
      margin: 26px 0;
      padding: 18px;
      border: 1px solid var(--border);
      background: #fff;
    }
    figure img {
      width: 100%;
      height: auto;
      display: block;
    }
    figcaption {
      margin-top: 14px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .references li { margin-bottom: 12px; }
  `;
}

function renderBibliography(usedKeys, references) {
  if (usedKeys.length === 0) {
    return '';
  }

  return `<section id="bibliography"><h2>References</h2><ol class="references">${usedKeys
    .map((label) => {
      const reference = references[label];

      return `<li id="${citationId(label)}"><strong>[${label}]</strong> ${escapeHtml(
        reference.authors
      )}. <em>${escapeHtml(reference.title)}</em>. ${escapeHtml(reference.year)}. <a href="${reference.url}">${reference.url}</a>.</li>`;
    })
    .join('')}</ol></section>`;
}

function renderArticleHtml({ title, abstract, chapters, references }) {
  const chapterLinks = chapters
    .map((chapter) => `<li><a href="#chapter-${chapter.number}">${renderInline(chapter.title, references)}</a></li>`)
    .join('');
  const usedKeys = [
    ...new Set([
      ...collectUsedCitationKeys(abstract, references),
      ...chapters.flatMap((chapter) => collectUsedCitationKeys(chapter.markdown, references))
    ])
  ];

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${articleCss()}</style>
  </head>
  <body>
    <main>
      <header>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${renderInline(abstract, references)}</p>
      </header>
      <nav class="toc">
        <strong>Contents</strong>
        <ol>${chapterLinks}</ol>
      </nav>
      ${chapters
        .map(
          (chapter) => `<section id="chapter-${chapter.number}">
${renderMarkdown(chapter.markdown, references)}
</section>`
        )
        .join('\n')}
      ${renderBibliography(usedKeys, references)}
    </main>
  </body>
</html>`;
}

export { collectUsedCitationKeys, renderArticleHtml, renderMarkdown };
