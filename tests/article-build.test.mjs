import assert from 'node:assert/strict';
import test from 'node:test';
import { runArticleBuildSkill } from '../src/index.mjs';

test('article build skill is incremental when inputs are unchanged', async () => {
  await runArticleBuildSkill({ articleRoot: 'docs/article', force: true });
  const secondRun = await runArticleBuildSkill({ articleRoot: 'docs/article' });

  assert.equal(secondRun.html.refreshed, false);
  assert.ok(secondRun.chapters.every((entry) => entry.refreshed === false));
});
