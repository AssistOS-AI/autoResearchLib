import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { roundNumber, toCsv, toMarkdownTable } from '../../src/index.mjs';
import { createGroupedBarChartSvg, createLineChartSvg } from '../../src/reporting/svgCharts.mjs';
import { assessNoveltyRisk } from '../../src/analysis/novelty.mjs';
import { analyzeBenchmarkCase, topDomain } from '../shared/benchmarkAnalysis.mjs';
import { readBenchmarkCases, readNoveltyCases } from '../shared/benchmarkDataset.mjs';

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateByGroup(rows, groupField) {
  const grouped = new Map();

  for (const row of rows) {
    const groupValue = row[groupField];
    const existing = grouped.get(groupValue) ?? [];
    existing.push(row);
    grouped.set(groupValue, existing);
  }

  return [...grouped.entries()].map(([groupValue, groupRows]) => ({
    [groupField]: groupValue,
    traceCount: groupRows.length,
    openSetCandidateRate: roundNumber(average(groupRows.map((row) => row.openSetCandidate))),
    falseClosureRate: roundNumber(average(groupRows.map((row) => row.falseClosureRisk))),
    questionAvailability: roundNumber(average(groupRows.map((row) => row.questionAvailable))),
    meanEntropy: roundNumber(average(groupRows.map((row) => row.domainEntropy))),
    meanUncertainty: roundNumber(average(groupRows.map((row) => row.uncertaintyScore))),
    meanTopWeight: roundNumber(average(groupRows.map((row) => row.topWeight)))
  }));
}

function buildResultsMarkdown(typeRows, prefixRows) {
  return `# Experiment 6: Open-set novelty and false-closure control

## Problem and Objective
This experiment tests whether the frontier reacts sanely when the observed workflow does not belong to the active benchmark families. The goal is not full novel-theory induction. The goal is disciplined uncertainty: wide enough frontiers, explicit questions, and low false closure under unseen and hybrid cases.

## Aggregate results by novelty condition
${toMarkdownTable(typeRows, [
  { header: 'Condition', value: (row) => row.caseGroup },
  { header: 'Traces', value: (row) => row.traceCount },
  { header: 'Open-set flag', value: (row) => row.openSetCandidateRate },
  { header: 'False closure', value: (row) => row.falseClosureRate },
  { header: 'Questions', value: (row) => row.questionAvailability },
  { header: 'Entropy', value: (row) => row.meanEntropy }
])}

## Aggregate novelty response by prefix depth
${toMarkdownTable(prefixRows, [
  { header: 'Prefix', value: (row) => `Prefix ${row.prefixDepth}` },
  { header: 'Traces', value: (row) => row.traceCount },
  { header: 'Open-set flag', value: (row) => row.openSetCandidateRate },
  { header: 'False closure', value: (row) => row.falseClosureRate },
  { header: 'Entropy', value: (row) => row.meanEntropy }
])}

## Interpretation
Strong performance here means the framework resists confident misclassification on unseen material and instead keeps uncertainty explicit. If the open-set flag rises on novelty cases without rising excessively on in-domain cases, the frontier is behaving as a healthy commitment control rather than as a forced classifier.
`;
}

function buildFailureAnalysisMarkdown(failureRows) {
  return `# Experiment 6 failure analysis

## Highest-risk novelty traces
${toMarkdownTable(failureRows, [
  { header: 'Case', value: (row) => row.caseId },
  { header: 'Condition', value: (row) => row.caseGroup },
  { header: 'Stage', value: (row) => row.prefixDepth },
  { header: 'Truth', value: (row) => row.groundTruthDomain ?? 'hybrid' },
  { header: 'Predicted', value: (row) => row.predictedDomain },
  { header: 'Open-set flag', value: (row) => row.openSetCandidate },
  { header: 'False closure', value: (row) => row.falseClosureRisk },
  { header: 'Entropy', value: (row) => row.domainEntropy },
  { header: 'Question', value: (row) => row.recommendedQuestion ?? '-' }
])}
`;
}

async function runExperiment6({ assetDir = null } = {}) {
  const noveltyCases = await readNoveltyCases();
  const inDomainCases = (await readBenchmarkCases()).filter((caseRecord) => caseRecord.split === 'test');
  const outputDir = new URL('./', import.meta.url);
  const rows = [];

  for (const caseRecord of noveltyCases) {
    for (const prefixDepth of [2, 3, 4]) {
      const bundle = analyzeBenchmarkCase(caseRecord, prefixDepth, {
        observerId: 'rich'
      });
      const novelty = assessNoveltyRisk(bundle.analysis);

      rows.push({
        caseId: caseRecord.id,
        caseGroup: caseRecord.noveltyType,
        prefixDepth,
        groundTruthDomain: caseRecord.groundTruthDomain,
        usageMode: bundle.usageMode,
        canonicalRunId: bundle.run.id,
        canonicalFamilies: bundle.canonicalFamilies.join('|'),
        predictedDomain: topDomain(bundle.analysis),
        topWeight: roundNumber(novelty.topWeight),
        domainEntropy: roundNumber(novelty.domainEntropy),
        frontierWidth: novelty.frontierWidth,
        supportGap: roundNumber(novelty.supportGap),
        uncertaintyScore: roundNumber(novelty.uncertaintyScore),
        openSetCandidate: novelty.openSetCandidate ? 1 : 0,
        falseClosureRisk: novelty.falseClosureRisk ? 1 : 0,
        questionAvailable: bundle.analysis.neighborhood.recommendedQuestion ? 1 : 0,
        recommendedQuestion: bundle.analysis.neighborhood.recommendedQuestion?.id ?? null
      });
    }
  }

  for (const caseRecord of inDomainCases) {
    for (const prefixDepth of [2, 3, 4]) {
      const bundle = analyzeBenchmarkCase(caseRecord, prefixDepth, {
        observerId: 'rich'
      });
      const novelty = assessNoveltyRisk(bundle.analysis);

      rows.push({
        caseId: caseRecord.id,
        caseGroup: 'in-domain',
        prefixDepth,
        groundTruthDomain: caseRecord.groundTruthDomain,
        usageMode: bundle.usageMode,
        canonicalRunId: bundle.run.id,
        canonicalFamilies: bundle.canonicalFamilies.join('|'),
        predictedDomain: topDomain(bundle.analysis),
        topWeight: roundNumber(novelty.topWeight),
        domainEntropy: roundNumber(novelty.domainEntropy),
        frontierWidth: novelty.frontierWidth,
        supportGap: roundNumber(novelty.supportGap),
        uncertaintyScore: roundNumber(novelty.uncertaintyScore),
        openSetCandidate: novelty.openSetCandidate ? 1 : 0,
        falseClosureRisk:
          novelty.falseClosureRisk && topDomain(bundle.analysis) !== caseRecord.groundTruthDomain ? 1 : 0,
        questionAvailable: bundle.analysis.neighborhood.recommendedQuestion ? 1 : 0,
        recommendedQuestion: bundle.analysis.neighborhood.recommendedQuestion?.id ?? null
      });
    }
  }

  const typeRows = aggregateByGroup(rows, 'caseGroup').sort((left, right) =>
    left.caseGroup.localeCompare(right.caseGroup)
  );
  const noveltyPrefixRows = aggregateByGroup(
    rows.filter((row) => row.caseGroup !== 'in-domain'),
    'prefixDepth'
  ).sort((left, right) => left.prefixDepth - right.prefixDepth);
  const summaryByNovelFamily = aggregateByGroup(
    rows.filter((row) => row.caseGroup !== 'in-domain').map((row) => ({
      ...row,
      novelFamily: row.groundTruthDomain ?? 'hybrid'
    })),
    'novelFamily'
  ).sort((left, right) => left.novelFamily.localeCompare(right.novelFamily));
  const failureRows = [...rows]
    .filter((row) => row.caseGroup !== 'in-domain')
    .sort((left, right) => {
      if (left.falseClosureRisk !== right.falseClosureRisk) {
        return right.falseClosureRisk - left.falseClosureRisk;
      }

      if (left.openSetCandidate !== right.openSetCandidate) {
        return left.openSetCandidate - right.openSetCandidate;
      }

      if (left.topWeight !== right.topWeight) {
        return right.topWeight - left.topWeight;
      }

      return left.caseId.localeCompare(right.caseId);
    })
    .slice(0, 12);
  const groupedSvg = createGroupedBarChartSvg({
    title: 'Experiment 6: Open-set response versus in-domain behavior',
    categories: typeRows.map((row) => row.caseGroup),
    yMax: 1,
    series: [
      {
        label: 'Open-set flag',
        color: '#2563eb',
        values: typeRows.map((row) => row.openSetCandidateRate)
      },
      {
        label: 'False closure',
        color: '#dc2626',
        values: typeRows.map((row) => row.falseClosureRate)
      },
      {
        label: 'Question availability',
        color: '#7c3aed',
        values: typeRows.map((row) => row.questionAvailability)
      }
    ]
  });
  const prefixSvg = createLineChartSvg({
    title: 'Experiment 6: Novelty response by evidence depth',
    xValues: noveltyPrefixRows.map((row) => row.prefixDepth),
    yMax: 1,
    series: [
      {
        label: 'Open-set flag',
        color: '#2563eb',
        points: noveltyPrefixRows.map((row) => ({ x: row.prefixDepth, y: row.openSetCandidateRate }))
      },
      {
        label: 'False closure',
        color: '#dc2626',
        points: noveltyPrefixRows.map((row) => ({ x: row.prefixDepth, y: row.falseClosureRate }))
      }
    ]
  });

  const summary = {
    experimentId: 'experiment6',
    title: 'Open-set novelty and false-closure control',
    noveltyCaseCount: noveltyCases.length,
    inDomainCaseCount: inDomainCases.length,
    traceCount: rows.length,
    summaryByGroup: typeRows,
    summaryByPrefix: noveltyPrefixRows,
    summaryByNovelFamily,
    caseRows: rows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./group-summary.csv', outputDir),
    toCsv(typeRows, [
      { header: 'case_group', value: (row) => row.caseGroup },
      { header: 'trace_count', value: (row) => row.traceCount },
      { header: 'open_set_candidate_rate', value: (row) => row.openSetCandidateRate },
      { header: 'false_closure_rate', value: (row) => row.falseClosureRate },
      { header: 'question_availability', value: (row) => row.questionAvailability },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_uncertainty', value: (row) => row.meanUncertainty },
      { header: 'mean_top_weight', value: (row) => row.meanTopWeight }
    ])
  );
  await writeFile(
    new URL('./novel-family-summary.csv', outputDir),
    toCsv(summaryByNovelFamily, [
      { header: 'novel_family', value: (row) => row.novelFamily },
      { header: 'trace_count', value: (row) => row.traceCount },
      { header: 'open_set_candidate_rate', value: (row) => row.openSetCandidateRate },
      { header: 'false_closure_rate', value: (row) => row.falseClosureRate },
      { header: 'question_availability', value: (row) => row.questionAvailability },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_uncertainty', value: (row) => row.meanUncertainty },
      { header: 'mean_top_weight', value: (row) => row.meanTopWeight }
    ])
  );
  await writeFile(
    new URL('./trace-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'case_group', value: (row) => row.caseGroup },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'ground_truth_domain', value: (row) => row.groundTruthDomain },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'canonical_families', value: (row) => row.canonicalFamilies },
      { header: 'predicted_domain', value: (row) => row.predictedDomain },
      { header: 'top_weight', value: (row) => row.topWeight },
      { header: 'domain_entropy', value: (row) => row.domainEntropy },
      { header: 'frontier_width', value: (row) => row.frontierWidth },
      { header: 'support_gap', value: (row) => row.supportGap },
      { header: 'uncertainty_score', value: (row) => row.uncertaintyScore },
      { header: 'open_set_candidate', value: (row) => row.openSetCandidate },
      { header: 'false_closure_risk', value: (row) => row.falseClosureRisk },
      { header: 'question_available', value: (row) => row.questionAvailable },
      { header: 'recommended_question', value: (row) => row.recommendedQuestion }
    ])
  );
  await writeFile(new URL('./novelty-response.svg', outputDir), groupedSvg);
  await writeFile(new URL('./novelty-prefix-response.svg', outputDir), prefixSvg);
  await writeFile(new URL('./results.md', outputDir), buildResultsMarkdown(typeRows, noveltyPrefixRows));
  await writeFile(new URL('./failure-analysis.md', outputDir), buildFailureAnalysisMarkdown(failureRows));

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment6-novelty.svg', assetDir), groupedSvg);
    await writeFile(new URL('./experiment6-prefix.svg', assetDir), prefixSvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment6();
}

export { runExperiment6 };
