import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runExperiment1 } from '../experiments/experiment1/run.mjs';
import { runExperiment2 } from '../experiments/experiment2/run.mjs';
import { runExperiment3 } from '../experiments/experiment3/run.mjs';

test('generated experiments preserve the intended validation signal', async () => {
  const experiment1 = await runExperiment1();
  const experiment2 = await runExperiment2();
  const experiment3 = await runExperiment3();
  const prefix2Coarse = experiment1.summaryRows.find(
    (row) => row.prefixDepth === 2 && row.observerId === 'coarse'
  );
  const prefix2Rich = experiment1.summaryRows.find(
    (row) => row.prefixDepth === 2 && row.observerId === 'rich'
  );
  const questionPrefix2 = experiment2.summaryRows.find((row) => row.prefixDepth === 2);
  const maskedPrefix2 = experiment3.summaryRows.find(
    (row) => row.conditionId === 'masked' && row.prefixDepth === 2
  );

  assert.equal(experiment1.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment1.usageContract.stableSurface, 'canonical-cnl');
  assert.equal(experiment2.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment2.usageContract.updateApi, 'applyEvidenceUpdate');
  assert.equal(experiment3.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment3.usageContract.updateApi, 'applyEvidenceUpdate');
  assert.ok(experiment1.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment2.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment3.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment2.usageExample);
  assert.ok(prefix2Rich.meanAccuracy > prefix2Coarse.meanAccuracy);
  assert.ok(prefix2Rich.meanEntropy < prefix2Coarse.meanEntropy);
  assert.ok(questionPrefix2.meanEntropyAfter < questionPrefix2.meanEntropyBefore);
  assert.ok(questionPrefix2.meanAccuracyAfter >= questionPrefix2.meanAccuracyBefore);
  assert.ok(maskedPrefix2.resolvedAccuracy > maskedPrefix2.frontierTopAccuracy);
  assert.ok(maskedPrefix2.resolvedAccuracy > maskedPrefix2.singleTheoryAccuracy);
  assert.ok(maskedPrefix2.questionAccuracyAfter > maskedPrefix2.questionAccuracyBefore);

  const usageBefore = await readFile(new URL('../experiments/experiment2/usage-example-before.cnl', import.meta.url), 'utf8');
  const usageAfter = await readFile(new URL('../experiments/experiment2/usage-example-after.cnl', import.meta.url), 'utf8');

  assert.match(usageBefore, /^RUN /m);
  assert.match(usageBefore, /^QUESTION /m);
  assert.match(usageAfter, /^UPDATE /m);
  assert.match(usageAfter, /^FRONTIER_RETAIN /m);
});
