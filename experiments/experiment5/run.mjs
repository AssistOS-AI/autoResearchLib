import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { roundNumber, toCsv, toMarkdownTable } from '../../src/index.mjs';
import { createGroupedBarChartSvg, createLineChartSvg, niceMax } from '../../src/reporting/svgCharts.mjs';
import { predictCueVote, predictNaiveBayes, trainNaiveBayesClassifier } from '../shared/baselines.mjs';
import { analyzeBenchmarkCase, benchmarkDomains, topDomain } from '../shared/benchmarkAnalysis.mjs';
import { readBenchmarkCases } from '../shared/benchmarkDataset.mjs';
import { buildConfusionMatrix, expectedCalibrationError, summarizeClassificationByLabel } from '../shared/statistics.mjs';

function singleTheoryDomain(analysis) {
  return (
    [...analysis.baseTheories].sort((left, right) => {
      const totalDelta = (right.scoreProfile.total ?? 0) - (left.scoreProfile.total ?? 0);

      if (totalDelta !== 0) {
        return totalDelta;
      }

      return left.id.localeCompare(right.id);
    })[0]?.domainId ?? null
  );
}

function aggregateByStratum(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const existing = grouped.get(row.stratum) ?? {
      stratum: row.stratum,
      traceCount: 0,
      frontierTopAccuracy: 0,
      frontierRetentionRate: 0,
      singleTheoryAccuracy: 0,
      cueVoteAccuracy: 0,
      naiveBayesAccuracy: 0,
      meanEntropy: 0,
      meanFrontierWidth: 0,
      prematureCollapseRate: 0,
      questionAvailability: 0,
      frontierCalibration: [],
      naiveCalibration: []
    };

    existing.traceCount += 1;
    existing.frontierTopAccuracy += row.frontierTopAccuracy;
    existing.frontierRetentionRate += row.frontierRetentionTruth;
    existing.singleTheoryAccuracy += row.singleTheoryAccuracy;
    existing.cueVoteAccuracy += row.cueVoteAccuracy;
    existing.naiveBayesAccuracy += row.naiveBayesAccuracy;
    existing.meanEntropy += row.domainEntropy;
    existing.meanFrontierWidth += row.frontierWidth;
    existing.prematureCollapseRate += row.prematureCollapse;
    existing.questionAvailability += row.questionAvailable;
    existing.frontierCalibration.push({
      confidence: row.frontierTopConfidence,
      correct: row.frontierTopAccuracy === 1
    });
    existing.naiveCalibration.push({
      confidence: row.naiveBayesConfidence,
      correct: row.naiveBayesAccuracy === 1
    });
    grouped.set(row.stratum, existing);
  }

  return [...grouped.values()].map((entry) => ({
    stratum: entry.stratum,
    traceCount: entry.traceCount,
    frontierTopAccuracy: roundNumber(entry.frontierTopAccuracy / entry.traceCount),
    frontierRetentionRate: roundNumber(entry.frontierRetentionRate / entry.traceCount),
    singleTheoryAccuracy: roundNumber(entry.singleTheoryAccuracy / entry.traceCount),
    cueVoteAccuracy: roundNumber(entry.cueVoteAccuracy / entry.traceCount),
    naiveBayesAccuracy: roundNumber(entry.naiveBayesAccuracy / entry.traceCount),
    meanEntropy: roundNumber(entry.meanEntropy / entry.traceCount),
    meanFrontierWidth: roundNumber(entry.meanFrontierWidth / entry.traceCount),
    prematureCollapseRate: roundNumber(entry.prematureCollapseRate / entry.traceCount),
    questionAvailability: roundNumber(entry.questionAvailability / entry.traceCount),
    frontierCalibrationEce: roundNumber(expectedCalibrationError(entry.frontierCalibration)),
    naiveBayesCalibrationEce: roundNumber(expectedCalibrationError(entry.naiveCalibration))
  }));
}

function aggregateByPrefix(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const existing = grouped.get(row.prefixDepth) ?? {
      prefixDepth: row.prefixDepth,
      traceCount: 0,
      frontierTopAccuracy: 0,
      naiveBayesAccuracy: 0,
      cueVoteAccuracy: 0,
      frontierRetentionRate: 0
    };

    existing.traceCount += 1;
    existing.frontierTopAccuracy += row.frontierTopAccuracy;
    existing.naiveBayesAccuracy += row.naiveBayesAccuracy;
    existing.cueVoteAccuracy += row.cueVoteAccuracy;
    existing.frontierRetentionRate += row.frontierRetentionTruth;
    grouped.set(row.prefixDepth, existing);
  }

  return [...grouped.values()]
    .map((entry) => ({
      prefixDepth: entry.prefixDepth,
      traceCount: entry.traceCount,
      frontierTopAccuracy: roundNumber(entry.frontierTopAccuracy / entry.traceCount),
      naiveBayesAccuracy: roundNumber(entry.naiveBayesAccuracy / entry.traceCount),
      cueVoteAccuracy: roundNumber(entry.cueVoteAccuracy / entry.traceCount),
      frontierRetentionRate: roundNumber(entry.frontierRetentionRate / entry.traceCount)
    }))
    .sort((left, right) => left.prefixDepth - right.prefixDepth);
}

function summarizeByDomain(rows) {
  return summarizeClassificationByLabel(rows, {
    labels: benchmarkDomains.map((domain) => domain.id),
    predictionField: 'frontierTopDomain',
    rankField: 'groundTruthRank'
  })
    .map((row) => ({
      domainId: row.label,
      support: row.support,
      predicted: row.predicted,
      precision: roundNumber(row.precision),
      recall: roundNumber(row.recall),
      f1: roundNumber(row.f1),
      meanTruthRank: row.meanRank === null ? null : roundNumber(row.meanRank)
    }))
    .sort((left, right) => left.domainId.localeCompare(right.domainId));
}

function buildFailureAnalysisMarkdown(domainRows, worstRows, confusionMatrix) {
  return `# Experiment 5 failure analysis

## Lowest-performing domains
${toMarkdownTable(domainRows.slice(0, 4), [
  { header: 'Domain', value: (row) => row.domainId },
  { header: 'Support', value: (row) => row.support },
  { header: 'Precision', value: (row) => row.precision },
  { header: 'Recall', value: (row) => row.recall },
  { header: 'F1', value: (row) => row.f1 },
  { header: 'Mean truth rank', value: (row) => row.meanTruthRank ?? '-' }
])}

## Most damaging frontier misses
${toMarkdownTable(worstRows, [
  { header: 'Case', value: (row) => row.caseId },
  { header: 'Stage', value: (row) => row.prefixDepth },
  { header: 'Truth', value: (row) => row.groundTruthDomain },
  { header: 'Predicted', value: (row) => row.frontierTopDomain },
  { header: 'Confidence', value: (row) => row.frontierTopConfidence },
  { header: 'Truth rank', value: (row) => row.groundTruthRank ?? '-' },
  { header: 'Premature collapse', value: (row) => row.prematureCollapse }
])}

## Frontier confusion matrix
${toMarkdownTable(confusionMatrix, [
  { header: 'Actual', value: (row) => row.actual },
  { header: 'Predicted', value: (row) => row.predicted },
  { header: 'Count', value: (row) => row.count }
])}
`;
}

function buildResultsMarkdown(stratumRows, prefixRows, domainRows, caseCount) {
  return `# Experiment 5: Expanded benchmark under lexical variation and operational noise

## Problem and Objective
This experiment evaluates whether the frontier remains useful beyond the original eighteen-case controlled corpus. The benchmark expands the validation program to ${caseCount} semi-synthetic cases over seven workflow families and three difficulty strata: controlled wording, paraphrased wording, and noisy operational phrasing.

## Experimental Setup
The benchmark is split deterministically into development and test cases per domain family. The development split trains the external multinomial naive Bayes baseline. The test split is evaluated over all four prefix depths with the rich observer. Reported policies are cue-vote classification over phrase matches, single-best-theory ranking, the full frontier top domain, and frontier truth retention.

## Aggregate Results by difficulty stratum
${toMarkdownTable(stratumRows, [
  { header: 'Stratum', value: (row) => row.stratum },
  { header: 'Traces', value: (row) => row.traceCount },
  { header: 'Cue vote', value: (row) => row.cueVoteAccuracy },
  { header: 'Naive Bayes', value: (row) => row.naiveBayesAccuracy },
  { header: 'Single theory', value: (row) => row.singleTheoryAccuracy },
  { header: 'Frontier top', value: (row) => row.frontierTopAccuracy },
  { header: 'Truth retained', value: (row) => row.frontierRetentionRate },
  { header: 'Premature collapse', value: (row) => row.prematureCollapseRate }
])}

## Aggregate Results by prefix depth
${toMarkdownTable(prefixRows, [
  { header: 'Prefix', value: (row) => `Prefix ${row.prefixDepth}` },
  { header: 'Traces', value: (row) => row.traceCount },
  { header: 'Cue vote', value: (row) => row.cueVoteAccuracy },
  { header: 'Naive Bayes', value: (row) => row.naiveBayesAccuracy },
  { header: 'Frontier top', value: (row) => row.frontierTopAccuracy },
  { header: 'Truth retained', value: (row) => row.frontierRetentionRate }
])}

## Frontier performance by domain
${toMarkdownTable(domainRows, [
  { header: 'Domain', value: (row) => row.domainId },
  { header: 'Support', value: (row) => row.support },
  { header: 'Precision', value: (row) => row.precision },
  { header: 'Recall', value: (row) => row.recall },
  { header: 'F1', value: (row) => row.f1 },
  { header: 'Mean truth rank', value: (row) => row.meanTruthRank ?? '-' }
])}

## Interpretation
The key question is not only which policy ranks first, but which policy avoids premature closure as wording becomes less schematic. Frontier retention remains useful when paraphrase and noise degrade direct lexical cues because it can preserve the correct family on the active frontier even when the immediate top-ranked answer is still wrong. That behavior is visible in the gap between frontier-top accuracy and truth-retention rate, especially in the noisy stratum.
`;
}

async function runExperiment5({ assetDir = null } = {}) {
  const benchmarkCases = await readBenchmarkCases();
  const devCases = benchmarkCases.filter((caseRecord) => caseRecord.split === 'dev');
  const testCases = benchmarkCases.filter((caseRecord) => caseRecord.split === 'test');
  const trainingRows = devCases.flatMap((caseRecord) =>
    Array.from({ length: caseRecord.segments.length }, (_, index) => ({
      groundTruthDomain: caseRecord.groundTruthDomain,
      segments: caseRecord.segments.slice(0, index + 1)
    }))
  );
  const naiveBayesModel = trainNaiveBayesClassifier(trainingRows, benchmarkDomains);
  const outputDir = new URL('./', import.meta.url);
  const rows = [];

  for (const caseRecord of testCases) {
    for (let prefixDepth = 1; prefixDepth <= caseRecord.segments.length; prefixDepth += 1) {
      const bundle = analyzeBenchmarkCase(caseRecord, prefixDepth, {
        observerId: 'rich',
        domains: benchmarkDomains
      });
      const prefixText = caseRecord.segments.slice(0, prefixDepth).join(' ');
      const frontierTop = topDomain(bundle.analysis);
      const frontierTopConfidence = bundle.analysis.neighborhood.domainDistribution[0]?.weight ?? 0;
      const singleTheory = singleTheoryDomain(bundle.analysis);
      const cueVote = predictCueVote(prefixText, benchmarkDomains);
      const naiveBayes = predictNaiveBayes(naiveBayesModel, prefixText);
      const retainedTruth = bundle.analysis.neighborhood.frontier.some(
        (theory) => theory.domainId === caseRecord.groundTruthDomain
      );
      const groundTruthRankIndex = bundle.analysis.neighborhood.domainDistribution.findIndex(
        (entry) => entry.domainId === caseRecord.groundTruthDomain
      );

      rows.push({
        caseId: caseRecord.id,
        sourceCaseId: caseRecord.sourceCaseId,
        stratum: caseRecord.stratum,
        prefixDepth,
        groundTruthDomain: caseRecord.groundTruthDomain,
        benchmarkFamily: caseRecord.benchmarkFamily,
        usageMode: bundle.usageMode,
        canonicalRunId: bundle.run.id,
        frontierTopDomain: frontierTop,
        frontierTopConfidence: roundNumber(frontierTopConfidence),
        frontierTopAccuracy: frontierTop === caseRecord.groundTruthDomain ? 1 : 0,
        frontierRetentionTruth: retainedTruth ? 1 : 0,
        groundTruthRank: groundTruthRankIndex >= 0 ? groundTruthRankIndex + 1 : null,
        singleTheoryDomain: singleTheory,
        singleTheoryAccuracy: singleTheory === caseRecord.groundTruthDomain ? 1 : 0,
        cueVoteDomain: cueVote.predictedDomain,
        cueVoteConfidence: roundNumber(cueVote.confidence),
        cueVoteAccuracy: cueVote.predictedDomain === caseRecord.groundTruthDomain ? 1 : 0,
        naiveBayesDomain: naiveBayes.predictedDomain,
        naiveBayesConfidence: roundNumber(naiveBayes.confidence),
        naiveBayesAccuracy: naiveBayes.predictedDomain === caseRecord.groundTruthDomain ? 1 : 0,
        domainEntropy: roundNumber(bundle.analysis.neighborhood.domainEntropy),
        frontierWidth: bundle.analysis.neighborhood.frontier.length,
        questionAvailable: bundle.analysis.neighborhood.recommendedQuestion ? 1 : 0,
        prematureCollapse:
          frontierTop !== caseRecord.groundTruthDomain && !retainedTruth && frontierTopConfidence >= 0.6 ? 1 : 0
      });
    }
  }

  const summaryByStratum = aggregateByStratum(rows).sort((left, right) => left.stratum.localeCompare(right.stratum));
  const summaryByPrefix = aggregateByPrefix(rows);
  const summaryByDomain = summarizeByDomain(rows);
  const confusionMatrix = buildConfusionMatrix(rows, {
    labels: benchmarkDomains.map((domain) => domain.id),
    truthField: 'groundTruthDomain',
    predictionField: 'frontierTopDomain'
  }).filter((entry) => entry.count > 0);
  const failureRows = [...rows]
    .sort((left, right) => {
      if (left.frontierTopAccuracy !== right.frontierTopAccuracy) {
        return left.frontierTopAccuracy - right.frontierTopAccuracy;
      }

      if (left.frontierRetentionTruth !== right.frontierRetentionTruth) {
        return left.frontierRetentionTruth - right.frontierRetentionTruth;
      }

      if (left.frontierTopConfidence !== right.frontierTopConfidence) {
        return right.frontierTopConfidence - left.frontierTopConfidence;
      }

      return left.caseId.localeCompare(right.caseId);
    })
    .slice(0, 10);
  const accuracySvg = createGroupedBarChartSvg({
    title: 'Experiment 5: Accuracy across benchmark strata',
    categories: summaryByStratum.map((row) => row.stratum),
    yMax: 1,
    series: [
      {
        label: 'Cue vote',
        color: '#6b7280',
        values: summaryByStratum.map((row) => row.cueVoteAccuracy)
      },
      {
        label: 'Naive Bayes',
        color: '#0f766e',
        values: summaryByStratum.map((row) => row.naiveBayesAccuracy)
      },
      {
        label: 'Frontier top',
        color: '#7c3aed',
        values: summaryByStratum.map((row) => row.frontierTopAccuracy)
      },
      {
        label: 'Truth retained',
        color: '#dc2626',
        values: summaryByStratum.map((row) => row.frontierRetentionRate)
      }
    ]
  });
  const prefixSvg = createLineChartSvg({
    title: 'Experiment 5: Prefix-depth transfer on the expanded benchmark',
    xValues: summaryByPrefix.map((row) => row.prefixDepth),
    yMax: 1,
    series: [
      {
        label: 'Cue vote',
        color: '#6b7280',
        points: summaryByPrefix.map((row) => ({ x: row.prefixDepth, y: row.cueVoteAccuracy }))
      },
      {
        label: 'Naive Bayes',
        color: '#0f766e',
        points: summaryByPrefix.map((row) => ({ x: row.prefixDepth, y: row.naiveBayesAccuracy }))
      },
      {
        label: 'Frontier top',
        color: '#7c3aed',
        points: summaryByPrefix.map((row) => ({ x: row.prefixDepth, y: row.frontierTopAccuracy }))
      },
      {
        label: 'Truth retained',
        color: '#dc2626',
        points: summaryByPrefix.map((row) => ({ x: row.prefixDepth, y: row.frontierRetentionRate }))
      }
    ]
  });

  const summary = {
    experimentId: 'experiment5',
    title: 'Expanded benchmark under lexical variation and operational noise',
    usageContract: {
      api: 'analyzeEvidence',
      stableSurface: 'canonical-cnl'
    },
    benchmarkCaseCount: benchmarkCases.length,
    devCaseCount: devCases.length,
    testCaseCount: testCases.length,
    traceCount: rows.length,
    benchmarkDomains: benchmarkDomains.map((domain) => domain.id),
    summaryByStratum,
    summaryByPrefix,
    summaryByDomain,
    confusionMatrix,
    caseRows: rows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./stratum-summary.csv', outputDir),
    toCsv(summaryByStratum, [
      { header: 'stratum', value: (row) => row.stratum },
      { header: 'trace_count', value: (row) => row.traceCount },
      { header: 'cue_vote_accuracy', value: (row) => row.cueVoteAccuracy },
      { header: 'naive_bayes_accuracy', value: (row) => row.naiveBayesAccuracy },
      { header: 'single_theory_accuracy', value: (row) => row.singleTheoryAccuracy },
      { header: 'frontier_top_accuracy', value: (row) => row.frontierTopAccuracy },
      { header: 'frontier_retention_rate', value: (row) => row.frontierRetentionRate },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_frontier_width', value: (row) => row.meanFrontierWidth },
      { header: 'premature_collapse_rate', value: (row) => row.prematureCollapseRate },
      { header: 'question_availability', value: (row) => row.questionAvailability },
      { header: 'frontier_calibration_ece', value: (row) => row.frontierCalibrationEce },
      { header: 'naive_bayes_calibration_ece', value: (row) => row.naiveBayesCalibrationEce }
    ])
  );
  await writeFile(
    new URL('./trace-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'source_case_id', value: (row) => row.sourceCaseId },
      { header: 'stratum', value: (row) => row.stratum },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'ground_truth_domain', value: (row) => row.groundTruthDomain },
      { header: 'benchmark_family', value: (row) => row.benchmarkFamily },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'frontier_top_domain', value: (row) => row.frontierTopDomain },
      { header: 'frontier_top_confidence', value: (row) => row.frontierTopConfidence },
      { header: 'frontier_top_accuracy', value: (row) => row.frontierTopAccuracy },
      { header: 'frontier_retention_truth', value: (row) => row.frontierRetentionTruth },
      { header: 'ground_truth_rank', value: (row) => row.groundTruthRank },
      { header: 'single_theory_domain', value: (row) => row.singleTheoryDomain },
      { header: 'single_theory_accuracy', value: (row) => row.singleTheoryAccuracy },
      { header: 'cue_vote_domain', value: (row) => row.cueVoteDomain },
      { header: 'cue_vote_confidence', value: (row) => row.cueVoteConfidence },
      { header: 'cue_vote_accuracy', value: (row) => row.cueVoteAccuracy },
      { header: 'naive_bayes_domain', value: (row) => row.naiveBayesDomain },
      { header: 'naive_bayes_confidence', value: (row) => row.naiveBayesConfidence },
      { header: 'naive_bayes_accuracy', value: (row) => row.naiveBayesAccuracy },
      { header: 'domain_entropy', value: (row) => row.domainEntropy },
      { header: 'frontier_width', value: (row) => row.frontierWidth },
      { header: 'question_available', value: (row) => row.questionAvailable },
      { header: 'premature_collapse', value: (row) => row.prematureCollapse }
    ])
  );
  await writeFile(
    new URL('./domain-summary.csv', outputDir),
    toCsv(summaryByDomain, [
      { header: 'domain_id', value: (row) => row.domainId },
      { header: 'support', value: (row) => row.support },
      { header: 'predicted', value: (row) => row.predicted },
      { header: 'precision', value: (row) => row.precision },
      { header: 'recall', value: (row) => row.recall },
      { header: 'f1', value: (row) => row.f1 },
      { header: 'mean_truth_rank', value: (row) => row.meanTruthRank }
    ])
  );
  await writeFile(
    new URL('./confusion-matrix.csv', outputDir),
    toCsv(confusionMatrix, [
      { header: 'actual', value: (row) => row.actual },
      { header: 'predicted', value: (row) => row.predicted },
      { header: 'count', value: (row) => row.count }
    ])
  );
  await writeFile(new URL('./benchmark-accuracy.svg', outputDir), accuracySvg);
  await writeFile(new URL('./benchmark-prefix-transfer.svg', outputDir), prefixSvg);
  await writeFile(
    new URL('./results.md', outputDir),
    buildResultsMarkdown(summaryByStratum, summaryByPrefix, summaryByDomain, benchmarkCases.length)
  );
  await writeFile(
    new URL('./failure-analysis.md', outputDir),
    buildFailureAnalysisMarkdown(
      [...summaryByDomain].sort((left, right) => left.f1 - right.f1),
      failureRows,
      confusionMatrix
    )
  );

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment5-accuracy.svg', assetDir), accuracySvg);
    await writeFile(new URL('./experiment5-prefix-transfer.svg', assetDir), prefixSvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment5();
}

export { runExperiment5 };
