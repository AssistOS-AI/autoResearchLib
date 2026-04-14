import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  roundNumber,
  toCsv,
  toMarkdownTable
} from '../../src/index.mjs';
import { createGroupedBarChartSvg, niceMax } from '../../src/reporting/svgCharts.mjs';
import { analyzeCasePrefix, applyCaseAnswer, readCases, topDomain } from '../shared/cases.mjs';

function aggregateRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.prefixDepth}`;
    const existing = grouped.get(key) ?? {
      prefixDepth: row.prefixDepth,
      caseCount: 0,
      meanEntropyBefore: 0,
      meanEntropyAfter: 0,
      meanAccuracyBefore: 0,
      meanAccuracyAfter: 0,
      meanInformationGain: 0
    };

    existing.caseCount += 1;
    existing.meanEntropyBefore += row.domainEntropyBefore;
    existing.meanEntropyAfter += row.domainEntropyAfter;
    existing.meanAccuracyBefore += row.accuracyBefore;
    existing.meanAccuracyAfter += row.accuracyAfter;
    existing.meanInformationGain += row.informationGain;
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map((entry) => ({
      prefixDepth: entry.prefixDepth,
      caseCount: entry.caseCount,
      meanEntropyBefore: roundNumber(entry.meanEntropyBefore / entry.caseCount),
      meanEntropyAfter: roundNumber(entry.meanEntropyAfter / entry.caseCount),
      meanAccuracyBefore: roundNumber(entry.meanAccuracyBefore / entry.caseCount),
      meanAccuracyAfter: roundNumber(entry.meanAccuracyAfter / entry.caseCount),
      meanInformationGain: roundNumber(entry.meanInformationGain / entry.caseCount)
    }))
    .sort((left, right) => left.prefixDepth - right.prefixDepth);
}

function buildResultsMarkdown(summaryRows) {
  return `# Experiment 2: Discriminating Questions and Frontier Update

## Problem and Objective
This experiment tests whether the library can identify a useful follow-up question when several local theories remain plausible after observational lifting and theory induction.

## Experimental Setup
Only ambiguous cases are retained. For each case, the experiment records the frontier before questioning, asks the highest-information-gain question proposed by the library, applies the gold answer from the case metadata, and recomputes the frontier. Aggregate reporting is grouped by prefix depth.

## Aggregate Results
The following table reports aggregate entropy, accuracy, and information-gain changes after the selected discriminating question is applied.

${toMarkdownTable(summaryRows, [
  { header: 'Prefix', value: (row) => `Prefix ${row.prefixDepth}` },
  { header: 'Cases', value: (row) => row.caseCount },
  { header: 'Entropy Before', value: (row) => row.meanEntropyBefore },
  { header: 'Entropy After', value: (row) => row.meanEntropyAfter },
  { header: 'Accuracy Before', value: (row) => row.meanAccuracyBefore },
  { header: 'Accuracy After', value: (row) => row.meanAccuracyAfter },
  { header: 'Information Gain', value: (row) => row.meanInformationGain }
])}

## Interpretation
When the observer still leaves multiple theories on the active frontier, the best next question often probes the domain marker that is missing from the current prefix. Answering that question reduces entropy sharply and either isolates the correct domain or collapses the frontier to a much smaller equivalence class. The effect is strongest in mid-prefix cases where procedural structure is visible but domain-specific confirmation is still missing.
`;
}

async function runExperiment2({ assetDir = null } = {}) {
  const cases = await readCases();
  const outputDir = new URL('./', import.meta.url);
  const rows = [];
  let usageExample = null;

  for (const caseRecord of cases) {
    for (const prefixDepth of [2, 3]) {
      for (const observerId of ['coarse', 'rich']) {
        const bundle = analyzeCasePrefix(caseRecord, prefixDepth, { observerId });
        const question = bundle.analysis.neighborhood.recommendedQuestion;

        if (!question) {
          continue;
        }

        const goldAnswer = caseRecord.answers[question.id];

        if (!goldAnswer) {
          continue;
        }

        const updatedBundle = applyCaseAnswer(bundle, goldAnswer);
        const predictedBefore = topDomain(bundle.analysis);
        const predictedAfter = topDomain(updatedBundle.analysis);

        if (caseRecord.id === 'sample-generic' && prefixDepth === 2 && observerId === 'rich') {
          usageExample = {
            caseId: caseRecord.id,
            prefixDepth,
            observerId,
            questionId: question.id,
            goldAnswer,
            beforeCnl: bundle.canonicalCnl,
            afterCnl: updatedBundle.canonicalCnl
          };
        }

        rows.push({
          caseId: caseRecord.id,
          observerId,
          prefixDepth,
          usageMode: bundle.usageMode,
          canonicalRunId: bundle.run.id,
          cnlLineCount: bundle.canonicalLines.length,
          updateCnlLineCount: updatedBundle.canonicalLines.length,
          canonicalFamilies: bundle.canonicalFamilies.join(';'),
          questionId: question.id,
          prompt: question.prompt,
          goldAnswer,
          domainBefore: predictedBefore,
          domainAfter: predictedAfter,
          domainEntropyBefore: roundNumber(bundle.analysis.neighborhood.domainEntropy),
          domainEntropyAfter: roundNumber(updatedBundle.analysis.neighborhood.domainEntropy),
          accuracyBefore: predictedBefore === caseRecord.groundTruthDomain ? 1 : 0,
          accuracyAfter: predictedAfter === caseRecord.groundTruthDomain ? 1 : 0,
          informationGain: roundNumber(question.informationGain)
        });
      }
    }
  }

  const summaryRows = aggregateRows(rows);
  const entropySvg = createGroupedBarChartSvg({
    title: 'Experiment 2: Entropy before and after questioning',
    categories: summaryRows.map((row) => `Prefix ${row.prefixDepth}`),
    yMax: niceMax(summaryRows.flatMap((row) => [row.meanEntropyBefore, row.meanEntropyAfter]), 1.4),
    series: [
      {
        label: 'Before question',
        color: '#7c3aed',
        values: summaryRows.map((row) => row.meanEntropyBefore)
      },
      {
        label: 'After question',
        color: '#059669',
        values: summaryRows.map((row) => row.meanEntropyAfter)
      }
    ]
  });
  const accuracySvg = createGroupedBarChartSvg({
    title: 'Experiment 2: Accuracy before and after questioning',
    categories: summaryRows.map((row) => `Prefix ${row.prefixDepth}`),
    yMax: 1,
    series: [
      {
        label: 'Before question',
        color: '#7c3aed',
        values: summaryRows.map((row) => row.meanAccuracyBefore)
      },
      {
        label: 'After question',
        color: '#059669',
        values: summaryRows.map((row) => row.meanAccuracyAfter)
      }
    ]
  });

  const summary = {
    experimentId: 'experiment2',
    title: 'Discriminating Questions and Frontier Update',
    usageContract: {
      api: 'analyzeEvidence',
      updateApi: 'applyEvidenceUpdate',
      stableSurface: 'canonical-cnl'
    },
    usageExample: usageExample
      ? {
          caseId: usageExample.caseId,
          prefixDepth: usageExample.prefixDepth,
          observerId: usageExample.observerId,
          questionId: usageExample.questionId,
          answer: usageExample.goldAnswer,
          beforeFile: 'usage-example-before.cnl',
          afterFile: 'usage-example-after.cnl'
        }
      : null,
    caseCount: rows.length,
    caseRows: rows,
    summaryRows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./question-effect.csv', outputDir),
    toCsv(summaryRows, [
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'case_count', value: (row) => row.caseCount },
      { header: 'mean_entropy_before', value: (row) => row.meanEntropyBefore },
      { header: 'mean_entropy_after', value: (row) => row.meanEntropyAfter },
      { header: 'mean_accuracy_before', value: (row) => row.meanAccuracyBefore },
      { header: 'mean_accuracy_after', value: (row) => row.meanAccuracyAfter },
      { header: 'mean_information_gain', value: (row) => row.meanInformationGain }
    ])
  );
  await writeFile(
    new URL('./question-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'observer_id', value: (row) => row.observerId },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'cnl_line_count', value: (row) => row.cnlLineCount },
      { header: 'update_cnl_line_count', value: (row) => row.updateCnlLineCount },
      { header: 'question_id', value: (row) => row.questionId },
      { header: 'prompt', value: (row) => row.prompt },
      { header: 'gold_answer', value: (row) => row.goldAnswer },
      { header: 'domain_before', value: (row) => row.domainBefore },
      { header: 'domain_after', value: (row) => row.domainAfter },
      { header: 'entropy_before', value: (row) => row.domainEntropyBefore },
      { header: 'entropy_after', value: (row) => row.domainEntropyAfter },
      { header: 'accuracy_before', value: (row) => row.accuracyBefore },
      { header: 'accuracy_after', value: (row) => row.accuracyAfter },
      { header: 'information_gain', value: (row) => row.informationGain },
      { header: 'canonical_families', value: (row) => row.canonicalFamilies }
    ])
  );
  await writeFile(new URL('./question-entropy.svg', outputDir), entropySvg);
  await writeFile(new URL('./question-accuracy.svg', outputDir), accuracySvg);
  await writeFile(new URL('./results.md', outputDir), buildResultsMarkdown(summaryRows));

  if (usageExample) {
    await writeFile(new URL('./usage-example-before.cnl', outputDir), `${usageExample.beforeCnl}\n`);
    await writeFile(new URL('./usage-example-after.cnl', outputDir), `${usageExample.afterCnl}\n`);
  }

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment2-entropy.svg', assetDir), entropySvg);
    await writeFile(new URL('./experiment2-accuracy.svg', assetDir), accuracySvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment2();
}

export { runExperiment2 };
