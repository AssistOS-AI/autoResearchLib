import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { roundNumber, toCsv, toMarkdownTable } from '../../src/index.mjs';
import { createLineChartSvg, niceMax } from '../../src/reporting/svgCharts.mjs';
import { analyzeCasePrefix, readCases, topDomain } from '../shared/cases.mjs';

function aggregateRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.prefixDepth}:${row.observerId}`;
    const existing = grouped.get(key) ?? {
      prefixDepth: row.prefixDepth,
      observerId: row.observerId,
      caseCount: 0,
      meanAccuracy: 0,
      meanEntropy: 0,
      meanEquivalenceCompression: 0,
      questionAvailability: 0
    };

    existing.caseCount += 1;
    existing.meanAccuracy += row.accuracy;
    existing.meanEntropy += row.domainEntropy;
    existing.meanEquivalenceCompression += row.equivalenceCompression;
    existing.questionAvailability += row.questionAvailable;
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map((entry) => ({
      prefixDepth: entry.prefixDepth,
      observerId: entry.observerId,
      caseCount: entry.caseCount,
      meanAccuracy: roundNumber(entry.meanAccuracy / entry.caseCount),
      meanEntropy: roundNumber(entry.meanEntropy / entry.caseCount),
      meanEquivalenceCompression: roundNumber(entry.meanEquivalenceCompression / entry.caseCount),
      questionAvailability: roundNumber(entry.questionAvailability / entry.caseCount)
    }))
    .sort((left, right) => {
      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      return left.observerId.localeCompare(right.observerId);
    });
}

function buildResultsMarkdown(summaryRows, caseCount) {
  const accuracyRows = summaryRows.map((row) => ({
    prefix: `Prefix ${row.prefixDepth}`,
    observer: row.observerId,
    accuracy: row.meanAccuracy
  }));
  const entropyRows = summaryRows.map((row) => ({
    prefix: `Prefix ${row.prefixDepth}`,
    observer: row.observerId,
    entropy: row.meanEntropy
  }));

  return `# Experiment 1: Observer Families and Frontier Entropy

## Problem and Objective
This experiment tests whether a richer observer family constrains the local theory frontier earlier than a coarse observer that mostly tracks generic workflow signal.

## Experimental Setup
The dataset contains ${caseCount} workflow cases distributed across the domains \`package\`, \`sample\`, and \`manuscript\`. Each case is revealed through four prefixes. For every prefix, the library is executed with the \`coarse\` observer and with the \`rich\` observer. The recorded metrics are top-domain accuracy, frontier entropy over the retained domain distribution, equivalence compression, and whether a discriminating question remains available.

## Mean Domain Accuracy
The following table reports mean top-domain accuracy by prefix depth and observer family.

${toMarkdownTable(accuracyRows, [
  { header: 'Prefix', value: (row) => row.prefix },
  { header: 'Observer', value: (row) => row.observer },
  { header: 'Accuracy', value: (row) => row.accuracy }
])}

## Mean Frontier Entropy
The following table reports mean frontier entropy for the same prefix and observer combinations.

${toMarkdownTable(entropyRows, [
  { header: 'Prefix', value: (row) => row.prefix },
  { header: 'Observer', value: (row) => row.observer },
  { header: 'Entropy', value: (row) => row.entropy }
])}

## Interpretation
The coarse observer remains biased toward a generic package-like explanation when the text exposes only broad workflow structure. The rich observer benefits immediately when subtle domain markers appear, which reduces entropy before the process becomes fully explicit. Once overt procedural markers or terminal outcomes arrive, both observers converge, but the richer observer reaches a confident frontier earlier and leaves fewer unresolved equivalence classes.
`;
}

async function runExperiment1({ assetDir = null } = {}) {
  const cases = await readCases();
  const outputDir = new URL('./', import.meta.url);
  const rows = [];

  for (const caseRecord of cases) {
    for (let prefixDepth = 1; prefixDepth <= caseRecord.segments.length; prefixDepth += 1) {
      for (const observerId of ['coarse', 'rich']) {
        const bundle = analyzeCasePrefix(caseRecord, prefixDepth, { observerId });
        const predictedDomain = topDomain(bundle.analysis);
        const retainedCount = bundle.analysis.neighborhood.frontier.length;
        const equivalenceClassCount = Math.max(1, bundle.analysis.neighborhood.equivalenceClasses.length);

        rows.push({
          caseId: caseRecord.id,
          groundTruthDomain: caseRecord.groundTruthDomain,
          prefixDepth,
          observerId,
          usageMode: bundle.usageMode,
          canonicalRunId: bundle.run.id,
          cnlLineCount: bundle.canonicalLines.length,
          canonicalFamilies: bundle.canonicalFamilies.join(';'),
          predictedDomain,
          accuracy: predictedDomain === caseRecord.groundTruthDomain ? 1 : 0,
          domainEntropy: roundNumber(bundle.analysis.neighborhood.domainEntropy),
          equivalenceCompression: roundNumber(retainedCount / equivalenceClassCount),
          questionAvailable: bundle.analysis.neighborhood.recommendedQuestion ? 1 : 0,
          retainedDomains: bundle.analysis.neighborhood.domainDistribution
            .map((entry) => `${entry.domainId}:${roundNumber(entry.weight)}`)
            .join(';')
        });
      }
    }
  }

  const summaryRows = aggregateRows(rows);
  const accuracySvg = createLineChartSvg({
    title: 'Experiment 1: Mean domain accuracy by prefix',
    xValues: [1, 2, 3, 4],
    yMax: 1,
    series: [
      {
        label: 'Coarse observer',
        color: '#1d4ed8',
        points: summaryRows
          .filter((row) => row.observerId === 'coarse')
          .map((row) => ({ x: row.prefixDepth, y: row.meanAccuracy }))
      },
      {
        label: 'Rich observer',
        color: '#dc2626',
        points: summaryRows
          .filter((row) => row.observerId === 'rich')
          .map((row) => ({ x: row.prefixDepth, y: row.meanAccuracy }))
      }
    ]
  });
  const entropySvg = createLineChartSvg({
    title: 'Experiment 1: Mean frontier entropy by prefix',
    xValues: [1, 2, 3, 4],
    yMax: niceMax(summaryRows.map((row) => row.meanEntropy), 1.4),
    series: [
      {
        label: 'Coarse observer',
        color: '#1d4ed8',
        points: summaryRows
          .filter((row) => row.observerId === 'coarse')
          .map((row) => ({ x: row.prefixDepth, y: row.meanEntropy }))
      },
      {
        label: 'Rich observer',
        color: '#dc2626',
        points: summaryRows
          .filter((row) => row.observerId === 'rich')
          .map((row) => ({ x: row.prefixDepth, y: row.meanEntropy }))
      }
    ]
  });

  const summary = {
    experimentId: 'experiment1',
    title: 'Observer Families and Frontier Entropy',
    usageContract: {
      api: 'analyzeEvidence',
      stableSurface: 'canonical-cnl'
    },
    caseCount: cases.length,
    caseRows: rows,
    summaryRows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./observer-summary.csv', outputDir),
    toCsv(summaryRows, [
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'observer_id', value: (row) => row.observerId },
      { header: 'case_count', value: (row) => row.caseCount },
      { header: 'mean_accuracy', value: (row) => row.meanAccuracy },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_equivalence_compression', value: (row) => row.meanEquivalenceCompression },
      { header: 'question_availability', value: (row) => row.questionAvailability }
    ])
  );
  await writeFile(
    new URL('./case-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'ground_truth_domain', value: (row) => row.groundTruthDomain },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'observer_id', value: (row) => row.observerId },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'cnl_line_count', value: (row) => row.cnlLineCount },
      { header: 'predicted_domain', value: (row) => row.predictedDomain },
      { header: 'accuracy', value: (row) => row.accuracy },
      { header: 'domain_entropy', value: (row) => row.domainEntropy },
      { header: 'equivalence_compression', value: (row) => row.equivalenceCompression },
      { header: 'question_available', value: (row) => row.questionAvailable },
      { header: 'canonical_families', value: (row) => row.canonicalFamilies },
      { header: 'retained_domains', value: (row) => row.retainedDomains }
    ])
  );
  await writeFile(new URL('./observer-accuracy.svg', outputDir), accuracySvg);
  await writeFile(new URL('./observer-entropy.svg', outputDir), entropySvg);
  await writeFile(new URL('./results.md', outputDir), buildResultsMarkdown(summaryRows, cases.length));

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment1-accuracy.svg', assetDir), accuracySvg);
    await writeFile(new URL('./experiment1-entropy.svg', assetDir), entropySvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment1();
}

export { runExperiment1 };
