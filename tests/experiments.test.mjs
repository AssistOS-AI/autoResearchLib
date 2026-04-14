import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runExperiment1 } from '../experiments/experiment1/run.mjs';
import { runExperiment2 } from '../experiments/experiment2/run.mjs';
import { runExperiment3 } from '../experiments/experiment3/run.mjs';
import { runExperiment4 } from '../experiments/experiment4/run.mjs';
import { runExperiment5 } from '../experiments/experiment5/run.mjs';
import { runExperiment6 } from '../experiments/experiment6/run.mjs';
import { runExperiment7 } from '../experiments/experiment7/run.mjs';

test('generated experiments preserve the intended validation signal', async () => {
  const experiment1 = await runExperiment1();
  const experiment2 = await runExperiment2();
  const experiment3 = await runExperiment3();
  const experiment4 = await runExperiment4();
  const experiment5 = await runExperiment5();
  const experiment6 = await runExperiment6();
  const experiment7 = await runExperiment7();
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
  const baselineAblation = experiment4.ablations.find((row) => row.id === 'baseline');
  const coarseAblation = experiment4.ablations.find((row) => row.id === 'coarse-observer');
  const noRescueAblation = experiment4.ablations.find((row) => row.id === 'no-domain-rescue');
  const benchmarkPrefix1 = experiment5.summaryByPrefix.find((row) => row.prefixDepth === 1);
  const benchmarkPrefix2 = experiment5.summaryByPrefix.find((row) => row.prefixDepth === 2);
  const openSetNovelty = experiment6.summaryByGroup.find((row) => row.caseGroup === 'open-set');
  const inDomainNovelty = experiment6.summaryByGroup.find((row) => row.caseGroup === 'in-domain');
  const cleanIgBudget0 = experiment7.summaryRows.find(
    (row) => row.conditionId === 'clean-gold' && row.questionPolicy === 'information-gain' && row.budget === 0
  );
  const cleanIgBudget2 = experiment7.summaryRows.find(
    (row) => row.conditionId === 'clean-gold' && row.questionPolicy === 'information-gain' && row.budget === 2
  );
  const noisyIgBudget2 = experiment7.summaryRows.find(
    (row) => row.conditionId === 'masked-noisy' && row.questionPolicy === 'information-gain' && row.budget === 2
  );
  const noisyRandomBudget2 = experiment7.summaryRows.find(
    (row) => row.conditionId === 'masked-noisy' && row.questionPolicy === 'random' && row.budget === 2
  );
  const adverseIgBudget1 = experiment7.summaryRows.find(
    (row) =>
      row.conditionId === 'masked-adversarial' &&
      row.questionPolicy === 'information-gain' &&
      row.budget === 1
  );
  const adverseRandomBudget1 = experiment7.summaryRows.find(
    (row) => row.conditionId === 'masked-adversarial' && row.questionPolicy === 'random' && row.budget === 1
  );

  assert.equal(experiment1.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment1.usageContract.stableSurface, 'canonical-cnl');
  assert.equal(experiment2.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment2.usageContract.updateApi, 'applyEvidenceUpdate');
  assert.equal(experiment3.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment3.usageContract.updateApi, 'applyEvidenceUpdate');
  assert.equal(experiment5.usageContract.api, 'analyzeEvidence');
  assert.equal(experiment5.usageContract.stableSurface, 'canonical-cnl');
  assert.ok(experiment1.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment2.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment3.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment5.caseRows.every((row) => row.usageMode === 'canonical-cnl'));
  assert.ok(experiment2.usageExample);
  assert.ok(prefix2Rich.meanAccuracy > prefix2Coarse.meanAccuracy);
  assert.ok(prefix2Rich.meanEntropy < prefix2Coarse.meanEntropy);
  assert.ok(questionPrefix2.meanEntropyAfter < questionPrefix2.meanEntropyBefore);
  assert.ok(questionPrefix2.meanAccuracyAfter >= questionPrefix2.meanAccuracyBefore);
  assert.ok(maskedPrefix2.resolvedAccuracy > maskedPrefix2.frontierTopAccuracy);
  assert.ok(maskedPrefix2.resolvedAccuracy > maskedPrefix2.singleTheoryAccuracy);
  assert.ok(maskedPrefix2.questionAccuracyAfter > maskedPrefix2.questionAccuracyBefore);
  assert.ok(baselineAblation.topAccuracy > coarseAblation.topAccuracy);
  assert.ok(noRescueAblation.truthRetentionRate < baselineAblation.truthRetentionRate);
  assert.ok(experiment4.sensitivitySamples.every((row) => row.topAccuracy >= 0.98));
  assert.ok(experiment5.summaryByStratum.every((row) => row.frontierRetentionRate >= row.frontierTopAccuracy));
  assert.equal(experiment5.summaryByDomain.length, 7);
  assert.ok(experiment5.confusionMatrix.length > 0);
  assert.ok(benchmarkPrefix2.frontierTopAccuracy > benchmarkPrefix1.frontierTopAccuracy);
  assert.ok(openSetNovelty.openSetCandidateRate > inDomainNovelty.openSetCandidateRate);
  assert.ok(openSetNovelty.meanEntropy > inDomainNovelty.meanEntropy);
  assert.ok(experiment6.summaryByNovelFamily.length >= 6);
  assert.ok(cleanIgBudget2.finalAccuracy > cleanIgBudget0.finalAccuracy);
  assert.ok(noisyIgBudget2.finalAccuracy > noisyRandomBudget2.finalAccuracy);
  assert.ok(adverseIgBudget1.meanEntropy < adverseRandomBudget1.meanEntropy);
  assert.ok(experiment7.stepRows.length > 0);

  const usageBefore = await readFile(new URL('../experiments/experiment2/usage-example-before.cnl', import.meta.url), 'utf8');
  const usageAfter = await readFile(new URL('../experiments/experiment2/usage-example-after.cnl', import.meta.url), 'utf8');

  assert.match(usageBefore, /^RUN /m);
  assert.match(usageBefore, /^QUESTION /m);
  assert.match(usageAfter, /^UPDATE /m);
  assert.match(usageAfter, /^FRONTIER_RETAIN /m);
});
