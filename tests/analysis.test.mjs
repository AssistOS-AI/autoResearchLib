import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeText,
  analyzeEvidence,
  applyDiscriminatingAnswer,
  applyEvidenceUpdate
} from '../src/index.mjs';

test('coarse analysis retains multiple plausible domains and proposes a question', () => {
  const analysis = analyzeText(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    { observerId: 'coarse' }
  );

  assert.ok(analysis.neighborhood.domainDistribution.length > 1);
  assert.ok(analysis.neighborhood.domainEntropy > 0);
  assert.equal(analysis.neighborhood.recommendedQuestion?.id, 'package-dispatch');
});

test('rich observer uses subtle sample cues earlier than the coarse observer', () => {
  const text =
    'The item was registered and placed in the queue. A specimen identifier was attached and the record was updated.';
  const coarse = analyzeText(text, { observerId: 'coarse' });
  const rich = analyzeText(text, { observerId: 'rich' });

  assert.equal(coarse.neighborhood.domainDistribution[0].domainId, 'package');
  assert.equal(rich.neighborhood.domainDistribution[0].domainId, 'sample');
  assert.ok(rich.neighborhood.domainEntropy < coarse.neighborhood.domainEntropy);
});

test('answering the discriminating question reduces frontier entropy', () => {
  const analysis = analyzeText(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    { observerId: 'coarse' }
  );
  const updated = applyDiscriminatingAnswer(analysis, 'yes');

  assert.ok(updated.neighborhood.domainEntropy < analysis.neighborhood.domainEntropy);
  assert.equal(updated.neighborhood.domainDistribution[0].domainId, 'package');
});

test('analyzeEvidence returns a canonical CNL bundle over the symbolic analysis', () => {
  const bundle = analyzeEvidence(
    {
      sourceId: 'sample-generic',
      segments: [
        'The item was registered and placed in the queue.',
        'A label was attached and the record was updated.'
      ],
      metadata: {
        caseId: 'sample-generic',
        prefixDepth: 2
      }
    },
    {
      observerId: 'rich',
      runId: 'sample_generic_p2_rich'
    }
  );

  assert.equal(bundle.usageMode, 'canonical-cnl');
  assert.equal(bundle.run.id, 'sample_generic_p2_rich');
  assert.ok(bundle.canonicalLines.length > 0);
  assert.match(bundle.canonicalCnl, /^RUN id="sample_generic_p2_rich"$/m);
  assert.match(bundle.canonicalCnl, /^PROVENANCE .*segment="SEG1".*span="\d+-\d+"/m);
  assert.match(bundle.canonicalCnl, /^QUESTION_ANSWER /m);
  assert.match(bundle.canonicalCnl, /^QUESTION_PARTITION /m);

  for (const family of [
    'RUN',
    'SOURCE',
    'SEGMENT',
    'OBSERVER',
    'BUDGET',
    'CONTEXT',
    'HYPOTHESIS',
    'OBSERVATION',
    'THEORY',
    'SCORE',
    'FRONTIER'
  ]) {
    assert.ok(bundle.canonicalFamilies.includes(family));
  }
});

test('alignment feature flag removes alignment utility from ranking weights', () => {
  const analysis = analyzeText(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    {
      observerId: 'coarse',
      policy: {
        features: {
          alignment: false
        }
      }
    }
  );

  assert.equal(analysis.policy.scoreWeights.alignmentUtility, 0);
  assert.equal(analysis.alignments.length, 0);
});

test('applyEvidenceUpdate emits canonical update families after an answered question', () => {
  const bundle = analyzeEvidence(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    { observerId: 'coarse' }
  );
  const updatedBundle = applyEvidenceUpdate(bundle, 'yes');

  assert.ok(updatedBundle.analysis.questionUpdate);
  assert.ok(updatedBundle.canonicalFamilies.includes('UPDATE'));
  assert.ok(updatedBundle.canonicalFamilies.includes('FRONTIER_RETAIN'));
  assert.match(updatedBundle.canonicalCnl, /^UPDATE /m);
  assert.match(updatedBundle.canonicalCnl, /^FRONTIER_RETAIN /m);
});
