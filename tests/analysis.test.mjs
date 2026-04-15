import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeText,
  analyzeEvidence,
  applyDiscriminatingAnswer,
  applyEvidenceUpdate,
  createTraceCollector
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

test('trace collector captures staged analysis events without changing the usage bundle', () => {
  const traceCollector = createTraceCollector({ purpose: 'analysis-test' });
  const bundle = analyzeEvidence(
    {
      sourceId: 'trace-demo',
      segments: [
        'The item was registered and placed in the queue.',
        'A label was attached and the record was updated.'
      ]
    },
    {
      observerId: 'coarse',
      runId: 'trace_demo_p2_coarse',
      queryBudget: 2,
      traceCollector
    }
  );
  const trace = traceCollector.exportTrace();
  const kinds = new Set(trace.rawEvents.map((event) => event.kind));

  assert.equal(bundle.run.queryBudgetLimit, 2);
  assert.equal(bundle.run.queryBudgetConsumed, 0);
  assert.ok(trace.snapshots.some((snapshot) => snapshot.stage === 'completed'));

  for (const kind of [
    'run.started',
    'source.segment.loaded',
    'cue.explicit.matched',
    'hypothesis.created',
    'theory.base.induced',
    'neighborhood.expanded',
    'frontier.updated',
    'question.selected',
    'alignment.completed',
    'run.completed'
  ]) {
    assert.ok(kinds.has(kind), `Expected trace event kind ${kind}`);
  }
});

test('query budgets and branch lineage stay explicit on evidence updates', () => {
  const bundle = analyzeEvidence(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    {
      observerId: 'coarse',
      runId: 'budget_demo_root',
      queryBudget: 1
    }
  );
  const branched = applyEvidenceUpdate(bundle, 'yes', {
    runId: 'budget_demo_branch'
  });
  const zeroBudgetBundle = analyzeEvidence(
    'The item was registered and placed in the queue. A label was attached and the record was updated.',
    {
      observerId: 'coarse',
      queryBudget: 0
    }
  );

  assert.equal(branched.run.parentRunId, 'budget_demo_root');
  assert.equal(branched.run.queryBudgetLimit, 1);
  assert.equal(branched.run.queryBudgetConsumed, 1);
  assert.equal(branched.run.branchTransition.kind, 'question-answer');
  assert.equal(branched.run.branchTransition.questionId, bundle.analysis.neighborhood.recommendedQuestion.id);
  assert.match(bundle.canonicalCnl, /^BUDGET .*query_limit=1 .*query_used=0$/m);
  assert.match(branched.canonicalCnl, /^BUDGET .*query_limit=1 .*query_used=1$/m);
  assert.match(branched.canonicalCnl, /^RUN id="budget_demo_branch" parent="budget_demo_root"$/m);
  assert.throws(
    () => applyEvidenceUpdate(zeroBudgetBundle, 'yes'),
    /Question budget exhausted/
  );
});
