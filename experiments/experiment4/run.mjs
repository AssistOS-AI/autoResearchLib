import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_ANALYSIS_POLICY,
  createAnalysisPolicy,
  roundNumber,
  toCsv,
  toMarkdownTable
} from '../../src/index.mjs';
import { createGroupedBarChartSvg, createLineChartSvg } from '../../src/reporting/svgCharts.mjs';
import { analyzeBenchmarkCase, topDomain } from '../shared/benchmarkAnalysis.mjs';
import { readBenchmarkCases } from '../shared/benchmarkDataset.mjs';
import { bootstrapConfidenceInterval, createSeededRng } from '../shared/statistics.mjs';

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildTraceRows(cases, { observerId = 'rich', policy, scenarioId, frontierLimit } = {}) {
  const rows = [];

  for (const caseRecord of cases) {
    for (const prefixDepth of [2, 3, 4]) {
      const bundle = analyzeBenchmarkCase(caseRecord, prefixDepth, {
        observerId,
        policy,
        frontierLimit
      });
      const predicted = topDomain(bundle.analysis);
      const retainedTruth = bundle.analysis.neighborhood.frontier.some(
        (theory) => theory.domainId === caseRecord.groundTruthDomain
      );
      const confidence = bundle.analysis.neighborhood.domainDistribution[0]?.weight ?? 0;

      rows.push({
        scenarioId,
        caseId: caseRecord.id,
        stratum: caseRecord.stratum,
        prefixDepth,
        groundTruthDomain: caseRecord.groundTruthDomain,
        predictedDomain: predicted,
        topAccuracy: predicted === caseRecord.groundTruthDomain ? 1 : 0,
        truthRetention: retainedTruth ? 1 : 0,
        domainEntropy: bundle.analysis.neighborhood.domainEntropy,
        frontierWidth: bundle.analysis.neighborhood.frontier.length,
        prematureCollapse: predicted !== caseRecord.groundTruthDomain && !retainedTruth && confidence >= 0.6 ? 1 : 0,
        questionAvailable: bundle.analysis.neighborhood.recommendedQuestion ? 1 : 0,
        usageMode: bundle.usageMode,
        canonicalRunId: bundle.run.id
      });
    }
  }

  return rows;
}

function summarizeScenario(rows, baselinePredictions = new Map()) {
  const topAccuracyValues = rows.map((row) => row.topAccuracy);
  const truthRetentionValues = rows.map((row) => row.truthRetention);
  const agreementValues = rows.map((row) => {
    const baseline = baselinePredictions.get(`${row.caseId}:${row.prefixDepth}`);
    return baseline ? Number(baseline === row.predictedDomain) : 1;
  });

  return {
    traceCount: rows.length,
    topAccuracy: roundNumber(average(topAccuracyValues)),
    truthRetentionRate: roundNumber(average(truthRetentionValues)),
    meanEntropy: roundNumber(average(rows.map((row) => row.domainEntropy))),
    meanFrontierWidth: roundNumber(average(rows.map((row) => row.frontierWidth))),
    prematureCollapseRate: roundNumber(average(rows.map((row) => row.prematureCollapse))),
    questionAvailability: roundNumber(average(rows.map((row) => row.questionAvailable))),
    agreementWithBaseline: roundNumber(average(agreementValues)),
    topAccuracyCiLow: roundNumber(bootstrapConfidenceInterval(topAccuracyValues, average).lower),
    topAccuracyCiHigh: roundNumber(bootstrapConfidenceInterval(topAccuracyValues, average).upper),
    truthRetentionCiLow: roundNumber(bootstrapConfidenceInterval(truthRetentionValues, average).lower),
    truthRetentionCiHigh: roundNumber(bootstrapConfidenceInterval(truthRetentionValues, average).upper)
  };
}

function buildResultsMarkdown(ablationRows, sensitivityRows) {
  return `# Experiment 4: Sensitivity analysis and structural ablations

## Problem and Objective
This experiment tests whether the current frontier behavior depends on a narrow hyperparameter point or on a single structural shortcut. It runs deterministic ablations over the main symbolic components and then samples nearby policy configurations around the default support, rescue, and scoring weights.

## Structural ablations
${toMarkdownTable(ablationRows, [
  { header: 'Condition', value: (row) => row.label },
  { header: 'Accuracy', value: (row) => row.topAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Premature collapse', value: (row) => row.prematureCollapseRate },
  { header: 'Agreement', value: (row) => row.agreementWithBaseline }
])}

## Sampled policy region
${toMarkdownTable(sensitivityRows.slice(0, 10), [
  { header: 'Sample', value: (row) => row.label },
  { header: 'Accuracy', value: (row) => row.topAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Agreement', value: (row) => row.agreementWithBaseline },
  { header: 'Entropy', value: (row) => row.meanEntropy }
])}

## Interpretation
The important result is whether performance remains in a broad neighborhood rather than only at a single hand-tuned point. Structural ablations show which mechanisms carry most of the load for frontier truth retention and premature-collapse control. The sampled policy region then tests whether nearby settings preserve the qualitative ranking of conclusions.
`;
}

function ablationFigureLabel(id) {
  return {
    baseline: 'Baseline',
    'coarse-observer': 'Coarse obs.',
    'no-inferred-cues': 'No inferred',
    'frontier-4': 'Frontier 4',
    'frontier-12': 'Frontier 12',
    'no-domain-rescue': 'No rescue',
    'no-equivalence': 'No equivalence',
    'no-alignment': 'No alignment',
    'no-questions': 'No questions'
  }[id] ?? id;
}

function randomPolicySample(index, rng) {
  const defaultWeights = DEFAULT_ANALYSIS_POLICY.scoreWeights;

  return createAnalysisPolicy({
    supportWeights: {
      generic: roundNumber(0.18 + rng() * 0.24, 4),
      explicit: 1,
      inferred: roundNumber(0.45 + rng() * 0.5, 4)
    },
    hypothesisSelection: {
      focusRatio: roundNumber(0.2 + rng() * 0.25, 4),
      ambiguityRatio: roundNumber(0.3 + rng() * 0.25, 4)
    },
    frontier: {
      rescueTolerance: roundNumber(0.02 + rng() * 0.08, 4)
    },
    scoreWeights: {
      evidenceCoverage: roundNumber(Math.max(0.05, defaultWeights.evidenceCoverage + (rng() - 0.5) * 0.12), 4),
      predictiveAdequacy: roundNumber(Math.max(0.05, defaultWeights.predictiveAdequacy + (rng() - 0.5) * 0.1), 4),
      compressionUtility: roundNumber(Math.max(0.05, defaultWeights.compressionUtility + (rng() - 0.5) * 0.08), 4),
      compositionalSharpness: roundNumber(
        Math.max(0.05, defaultWeights.compositionalSharpness + (rng() - 0.5) * 0.08),
        4
      ),
      stability: roundNumber(Math.max(0.05, defaultWeights.stability + (rng() - 0.5) * 0.08), 4),
      alignmentUtility: roundNumber(Math.max(0.05, defaultWeights.alignmentUtility + (rng() - 0.5) * 0.08), 4)
    }
  });
}

async function runExperiment4({ assetDir = null } = {}) {
  const benchmarkCases = await readBenchmarkCases();
  const evaluationCases = benchmarkCases.filter((caseRecord) => caseRecord.split === 'test');
  const outputDir = new URL('./', import.meta.url);
  const baselineRows = buildTraceRows(evaluationCases, {
    observerId: 'rich',
    scenarioId: 'baseline'
  });
  const baselinePredictions = new Map(
    baselineRows.map((row) => [`${row.caseId}:${row.prefixDepth}`, row.predictedDomain])
  );

  const ablationScenarios = [
    { id: 'baseline', label: 'Baseline policy', observerId: 'rich', policy: undefined },
    {
      id: 'coarse-observer',
      label: 'Coarse observer',
      observerId: 'coarse',
      policy: undefined
    },
    {
      id: 'no-inferred-cues',
      label: 'No inferred cues',
      observerId: 'rich',
      policy: createAnalysisPolicy({ features: { inferredCues: false } })
    },
    {
      id: 'frontier-4',
      label: 'Frontier limit 4',
      observerId: 'rich',
      frontierLimit: 4,
      policy: undefined
    },
    {
      id: 'frontier-12',
      label: 'Frontier limit 12',
      observerId: 'rich',
      frontierLimit: 12,
      policy: undefined
    },
    {
      id: 'no-domain-rescue',
      label: 'No domain rescue',
      observerId: 'rich',
      policy: createAnalysisPolicy({ features: { domainRescue: false } })
    },
    {
      id: 'no-equivalence',
      label: 'No equivalence classes',
      observerId: 'rich',
      policy: createAnalysisPolicy({ features: { equivalenceClasses: false } })
    },
    {
      id: 'no-alignment',
      label: 'No alignment utility',
      observerId: 'rich',
      policy: createAnalysisPolicy({
        features: { alignment: false },
        scoreWeights: { alignmentUtility: 0 }
      })
    },
    {
      id: 'no-questions',
      label: 'No discriminating questions',
      observerId: 'rich',
      policy: createAnalysisPolicy({ features: { questions: false } })
    }
  ];

  const ablationRows = ablationScenarios.map((scenario) => {
    const rows =
      scenario.id === 'baseline'
        ? baselineRows
        : buildTraceRows(evaluationCases, {
            observerId: scenario.observerId,
            policy: scenario.policy,
            scenarioId: scenario.id,
            frontierLimit: scenario.frontierLimit
          });

    return {
      id: scenario.id,
      label: scenario.label,
      ...summarizeScenario(rows, baselinePredictions)
    };
  });

  const rng = createSeededRng(404);
  const sensitivityRows = Array.from({ length: 24 }, (_, index) => {
    const policy = randomPolicySample(index, rng);
    const rows = buildTraceRows(evaluationCases, {
      observerId: 'rich',
      policy,
      scenarioId: `sample-${index + 1}`
    });

    return {
      id: `sample-${index + 1}`,
      label: `Sample ${index + 1}`,
      policy,
      ...summarizeScenario(rows, baselinePredictions)
    };
  }).sort((left, right) => right.topAccuracy - left.topAccuracy);

  const ablationSvg = createGroupedBarChartSvg({
    title: 'Experiment 4: Structural ablations on the expanded benchmark',
    categories: ablationRows.map((row) => ablationFigureLabel(row.id)),
    yMax: 1,
    series: [
      {
        label: 'Accuracy',
        color: '#2563eb',
        values: ablationRows.map((row) => row.topAccuracy)
      },
      {
        label: 'Truth retained',
        color: '#dc2626',
        values: ablationRows.map((row) => row.truthRetentionRate)
      },
      {
        label: 'Premature collapse',
        color: '#6b7280',
        values: ablationRows.map((row) => row.prematureCollapseRate)
      }
    ]
  });
  const sensitivitySvg = createLineChartSvg({
    title: 'Experiment 4: Stability across sampled policy configurations',
    xValues: sensitivityRows.map((_, index) => index + 1),
    yMax: 1,
    series: [
      {
        label: 'Accuracy',
        color: '#2563eb',
        points: sensitivityRows.map((row, index) => ({ x: index + 1, y: row.topAccuracy }))
      },
      {
        label: 'Truth retained',
        color: '#dc2626',
        points: sensitivityRows.map((row, index) => ({ x: index + 1, y: row.truthRetentionRate }))
      },
      {
        label: 'Agreement with baseline',
        color: '#7c3aed',
        points: sensitivityRows.map((row, index) => ({ x: index + 1, y: row.agreementWithBaseline }))
      }
    ]
  });

  const summary = {
    experimentId: 'experiment4',
    title: 'Sensitivity analysis and structural ablations',
    evaluationCaseCount: evaluationCases.length,
    traceCount: baselineRows.length,
    ablations: ablationRows,
    sensitivitySamples: sensitivityRows.map((row) => ({
      id: row.id,
      label: row.label,
      topAccuracy: row.topAccuracy,
      truthRetentionRate: row.truthRetentionRate,
      agreementWithBaseline: row.agreementWithBaseline,
      meanEntropy: row.meanEntropy,
      meanFrontierWidth: row.meanFrontierWidth,
      rescueTolerance: row.policy.frontier.rescueTolerance,
      supportWeights: row.policy.supportWeights,
      scoreWeights: row.policy.scoreWeights
    }))
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./ablations.csv', outputDir),
    toCsv(ablationRows, [
      { header: 'condition', value: (row) => row.label },
      { header: 'trace_count', value: (row) => row.traceCount },
      { header: 'top_accuracy', value: (row) => row.topAccuracy },
      { header: 'top_accuracy_ci_low', value: (row) => row.topAccuracyCiLow },
      { header: 'top_accuracy_ci_high', value: (row) => row.topAccuracyCiHigh },
      { header: 'truth_retention_rate', value: (row) => row.truthRetentionRate },
      { header: 'truth_retention_ci_low', value: (row) => row.truthRetentionCiLow },
      { header: 'truth_retention_ci_high', value: (row) => row.truthRetentionCiHigh },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_frontier_width', value: (row) => row.meanFrontierWidth },
      { header: 'premature_collapse_rate', value: (row) => row.prematureCollapseRate },
      { header: 'question_availability', value: (row) => row.questionAvailability },
      { header: 'agreement_with_baseline', value: (row) => row.agreementWithBaseline }
    ])
  );
  await writeFile(
    new URL('./sensitivity-samples.csv', outputDir),
    toCsv(summary.sensitivitySamples, [
      { header: 'sample', value: (row) => row.label },
      { header: 'top_accuracy', value: (row) => row.topAccuracy },
      { header: 'truth_retention_rate', value: (row) => row.truthRetentionRate },
      { header: 'agreement_with_baseline', value: (row) => row.agreementWithBaseline },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_frontier_width', value: (row) => row.meanFrontierWidth },
      { header: 'rescue_tolerance', value: (row) => row.rescueTolerance },
      { header: 'support_generic', value: (row) => row.supportWeights.generic },
      { header: 'support_explicit', value: (row) => row.supportWeights.explicit },
      { header: 'support_inferred', value: (row) => row.supportWeights.inferred },
      { header: 'evidence_coverage_weight', value: (row) => row.scoreWeights.evidenceCoverage },
      { header: 'predictive_adequacy_weight', value: (row) => row.scoreWeights.predictiveAdequacy },
      { header: 'compression_utility_weight', value: (row) => row.scoreWeights.compressionUtility },
      { header: 'compositional_sharpness_weight', value: (row) => row.scoreWeights.compositionalSharpness },
      { header: 'stability_weight', value: (row) => row.scoreWeights.stability },
      { header: 'alignment_weight', value: (row) => row.scoreWeights.alignmentUtility }
    ])
  );
  await writeFile(new URL('./ablation-effects.svg', outputDir), ablationSvg);
  await writeFile(new URL('./policy-sensitivity.svg', outputDir), sensitivitySvg);
  await writeFile(
    new URL('./results.md', outputDir),
    buildResultsMarkdown(ablationRows, summary.sensitivitySamples)
  );

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment4-ablations.svg', assetDir), ablationSvg);
    await writeFile(new URL('./experiment4-sensitivity.svg', assetDir), sensitivitySvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment4();
}

export { runExperiment4 };
