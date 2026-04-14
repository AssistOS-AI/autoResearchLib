import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runArticleBuildSkill } from '../src/index.mjs';

test('article build skill is incremental when inputs are unchanged', async () => {
  await runArticleBuildSkill({ articleRoot: 'docs/article', force: true });
  const secondRun = await runArticleBuildSkill({ articleRoot: 'docs/article' });

  assert.equal(secondRun.html.refreshed, false);
  assert.ok(secondRun.chapters.every((entry) => entry.refreshed === false));
});

test('article build skill stays decoupled from repository src helpers', async () => {
  const skillSource = await readFile(new URL('../skills/article-build/skill.mjs', import.meta.url), 'utf8');
  const renderSource = await readFile(new URL('../skills/article-build/renderHtml.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(skillSource, /\.\.\/\.\.\/src\//);
  assert.doesNotMatch(renderSource, /\.\.\/\.\.\/src\//);
});

test('generated article html includes browser-side print and pdf controls', async () => {
  await runArticleBuildSkill({ articleRoot: 'docs/article', force: true });
  const html = await readFile(new URL('../docs/article/index.html', import.meta.url), 'utf8');

  assert.match(html, /data-article-action="print"/);
  assert.match(html, /window\.__articlePrint/);
  assert.match(html, /Print \/ Save PDF/);
});
