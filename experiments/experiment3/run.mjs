import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  analyzeEvidence,
  applyEvidenceUpdate,
  roundNumber,
  toCsv,
  toMarkdownTable
} from '../../src/index.mjs';
import { createGroupedBarChartSvg } from '../../src/reporting/svgCharts.mjs';
import { buildPrefixText, readCases, topDomain } from '../shared/cases.mjs';
import { maskText } from '../shared/cueMasking.mjs';

const CONDITION_LABELS = {
  clean: 'Clean',
  masked: 'Masked'
};

const CONDITION_ORDER = {
  clean: 0,
  masked: 1
};

function lexicalBaselineDomain(analysis) {
  const baseHypothesis = analysis.hypotheses.find((hypothesis) => hypothesis.focusDomain === null) ?? analysis.hypotheses[0];

  return (
    Object.entries(baseHypothesis?.supportByDomain ?? {})
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null
  );
}

function singleTheoryBaselineDomain(analysis) {
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

function summarizeQuestionMetrics(row) {
  if (!row.questionId) {
    return {
      questionAccuracyBefore: null,
      questionAccuracyAfter: null,
      rescuedByQuestion: null,
      entropyBeforeQuestion: null,
      entropyAfterQuestion: null
    };
  }

  return {
    questionAccuracyBefore: row.frontierTopAccuracy,
    questionAccuracyAfter: row.questionTopAccuracyAfter,
    rescuedByQuestion: row.rescuedByQuestion,
    entropyBeforeQuestion: row.domainEntropyBefore,
    entropyAfterQuestion: row.domainEntropyAfter
  };
}

function aggregateRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.conditionId}:${row.prefixDepth}`;
    const existing = grouped.get(key) ?? {
      conditionId: row.conditionId,
      prefixDepth: row.prefixDepth,
      caseCount: 0,
      lexicalAccuracy: 0,
      singleTheoryAccuracy: 0,
      frontierTopAccuracy: 0,
      resolvedAccuracy: 0,
      frontierRetentionRate: 0,
      ambiguousCount: 0,
      questionAccuracyBefore: 0,
      questionAccuracyAfter: 0,
      rescuedRate: 0,
      meanEntropyBeforeQuestion: 0,
      meanEntropyAfterQuestion: 0
    };
    const questionMetrics = summarizeQuestionMetrics(row);

    existing.caseCount += 1;
    existing.lexicalAccuracy += row.lexicalAccuracy;
    existing.singleTheoryAccuracy += row.singleTheoryAccuracy;
    existing.frontierTopAccuracy += row.frontierTopAccuracy;
    existing.resolvedAccuracy += row.resolvedAccuracy;
    existing.frontierRetentionRate += row.frontierRetainsTruth;

    if (row.questionId) {
      existing.ambiguousCount += 1;
      existing.questionAccuracyBefore += questionMetrics.questionAccuracyBefore;
      existing.questionAccuracyAfter += questionMetrics.questionAccuracyAfter;
      existing.rescuedRate += questionMetrics.rescuedByQuestion;
      existing.meanEntropyBeforeQuestion += questionMetrics.entropyBeforeQuestion;
      existing.meanEntropyAfterQuestion += questionMetrics.entropyAfterQuestion;
    }

    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map((entry) => ({
      conditionId: entry.conditionId,
      conditionLabel: CONDITION_LABELS[entry.conditionId],
      prefixDepth: entry.prefixDepth,
      label: `${CONDITION_LABELS[entry.conditionId]} P${entry.prefixDepth}`,
      caseCount: entry.caseCount,
      lexicalAccuracy: roundNumber(entry.lexicalAccuracy / entry.caseCount),
      singleTheoryAccuracy: roundNumber(entry.singleTheoryAccuracy / entry.caseCount),
      frontierTopAccuracy: roundNumber(entry.frontierTopAccuracy / entry.caseCount),
      resolvedAccuracy: roundNumber(entry.resolvedAccuracy / entry.caseCount),
      frontierRetentionRate: roundNumber(entry.frontierRetentionRate / entry.caseCount),
      ambiguousCount: entry.ambiguousCount,
      questionAccuracyBefore:
        entry.ambiguousCount > 0 ? roundNumber(entry.questionAccuracyBefore / entry.ambiguousCount) : null,
      questionAccuracyAfter:
        entry.ambiguousCount > 0 ? roundNumber(entry.questionAccuracyAfter / entry.ambiguousCount) : null,
      rescuedRate: entry.ambiguousCount > 0 ? roundNumber(entry.rescuedRate / entry.ambiguousCount) : null,
      meanEntropyBeforeQuestion:
        entry.ambiguousCount > 0 ? roundNumber(entry.meanEntropyBeforeQuestion / entry.ambiguousCount) : null,
      meanEntropyAfterQuestion:
        entry.ambiguousCount > 0 ? roundNumber(entry.meanEntropyAfterQuestion / entry.ambiguousCount) : null
    }))
    .sort((left, right) => {
      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      return CONDITION_ORDER[left.conditionId] - CONDITION_ORDER[right.conditionId];
    });
}

function valueOrNa(row, field) {
  return row[field] ?? 'n/a';
}

function buildResultsMarkdown(summaryRows, traceCount) {
  const maskedPrefix2 = summaryRows.find((row) => row.conditionId === 'masked' && row.prefixDepth === 2);
  const maskedPrefix3 = summaryRows.find((row) => row.conditionId === 'masked' && row.prefixDepth === 3);
  const maskedPrefix2RetentionText =
    maskedPrefix2?.frontierRetentionRate === 1
      ? 'all masked Prefix 2 traces'
      : `${maskedPrefix2?.frontierRetentionRate ?? 'n/a'} of the masked Prefix 2 traces`;
  const maskedPrefix3RetentionText =
    maskedPrefix3?.frontierRetentionRate === 1
      ? 'all masked Prefix 3 traces'
      : `${maskedPrefix3?.frontierRetentionRate ?? 'n/a'} of the masked Prefix 3 traces`;

  return `# Experiment 3: Frontier Retention Under Cue Masking

## Problem and Objective
This experiment tests whether delayed commitment remains useful when the most specific domain markers are rewritten into more generic administrative language. The goal is to compare the retained frontier against simpler policies that collapse early to a single domain or a single induced theory.

## Experimental Setup
The full corpus contributes ${summaryRows[0]?.caseCount ?? 0} cases at Prefix 2 and Prefix 3, and each trace is evaluated in clean and cue-masked form for a total of ${traceCount} analyzed traces. All runs use the rich observer so the comparison isolates theory management rather than observer blindness. The reported policies are a lexical-support baseline over the base observational hypothesis, a single-best-theory baseline over the induced base theories, the immediate top-ranked domain on the retained frontier, the end-to-end frontier result after one question when available, and the retained-frontier truth rate that asks whether the gold domain remains anywhere on the frontier.

## Aggregate Baseline Comparison
The following table reports the aggregate baseline comparison for each condition and prefix depth.

${toMarkdownTable(summaryRows, [
  { header: 'Condition', value: (row) => row.label },
  { header: 'Cases', value: (row) => row.caseCount },
  { header: 'Lexical baseline', value: (row) => row.lexicalAccuracy },
  { header: 'Single theory', value: (row) => row.singleTheoryAccuracy },
  { header: 'Frontier top', value: (row) => row.frontierTopAccuracy },
  { header: 'Frontier + one question', value: (row) => row.resolvedAccuracy },
  { header: 'Truth retained on frontier', value: (row) => row.frontierRetentionRate }
])}

## Question Recovery on Ambiguous Traces
The following table keeps only traces where the retained frontier still exposed a discriminating question.

${toMarkdownTable(summaryRows, [
  { header: 'Condition', value: (row) => row.label },
  { header: 'Ambiguous traces', value: (row) => row.ambiguousCount },
  { header: 'Accuracy before question', value: (row) => valueOrNa(row, 'questionAccuracyBefore') },
  { header: 'Accuracy after question', value: (row) => valueOrNa(row, 'questionAccuracyAfter') },
  { header: 'Rescued by questioning', value: (row) => valueOrNa(row, 'rescuedRate') },
  { header: 'Entropy before question', value: (row) => valueOrNa(row, 'meanEntropyBeforeQuestion') },
  { header: 'Entropy after question', value: (row) => valueOrNa(row, 'meanEntropyAfterQuestion') }
])}

## Interpretation
Cue masking produces the clearest separation at Prefix 2. Under masking, the lexical baseline falls to ${maskedPrefix2?.lexicalAccuracy ?? 'n/a'} and the single-theory baseline to ${maskedPrefix2?.singleTheoryAccuracy ?? 'n/a'}, while the retained frontier still keeps the correct domain somewhere on the frontier in ${maskedPrefix2RetentionText}. That retained structure matters because one question lifts end-to-end accuracy to ${maskedPrefix2?.resolvedAccuracy ?? 'n/a'} and raises ambiguous-trace accuracy from ${maskedPrefix2?.questionAccuracyBefore ?? 'n/a'} to ${maskedPrefix2?.questionAccuracyAfter ?? 'n/a'}.

By Prefix 3 the masked traces become easier but the same pattern remains visible. The retained frontier reaches ${maskedPrefix3?.frontierTopAccuracy ?? 'n/a'} top accuracy, and one question lifts the full pipeline to ${maskedPrefix3?.resolvedAccuracy ?? 'n/a'} while preserving the correct domain on the frontier in ${maskedPrefix3RetentionText}. The main conclusion is therefore not that masking becomes irrelevant. It is that the frontier supplies a disciplined buffer between weak textual evidence and premature commitment, and that the question policy can exploit that buffer when ambiguity persists.
`;
}

async function runExperiment3({ assetDir = null } = {}) {
  const cases = await readCases();
  const outputDir = new URL('./', import.meta.url);
  const rows = [];

  for (const caseRecord of cases) {
    for (const prefixDepth of [2, 3]) {
      const cleanText = buildPrefixText(caseRecord, prefixDepth);

      for (const conditionId of ['clean', 'masked']) {
        const text = conditionId === 'clean' ? cleanText : maskText(cleanText);
        const bundle = analyzeEvidence(
          {
            text,
            sourceId: caseRecord.id,
            metadata: {
              caseId: caseRecord.id,
              groundTruthDomain: caseRecord.groundTruthDomain,
              prefixDepth,
              conditionId
            }
          },
          {
            observerId: 'rich',
            runId: `${caseRecord.id}_${conditionId}_p${prefixDepth}_rich`
          }
        );
        const lexicalDomain = lexicalBaselineDomain(bundle.analysis);
        const singleTheoryDomain = singleTheoryBaselineDomain(bundle.analysis);
        const frontierTopDomain = topDomain(bundle.analysis);
        const question = bundle.analysis.neighborhood.recommendedQuestion;
        const frontierRetainsTruth = bundle.analysis.neighborhood.frontier.some(
          (theory) => theory.domainId === caseRecord.groundTruthDomain
        );
        const goldAnswer = question ? caseRecord.answers[question.id] ?? null : null;
        const updatedBundle = question && goldAnswer ? applyEvidenceUpdate(bundle, goldAnswer) : null;
        const questionTopDomainAfter = updatedBundle ? topDomain(updatedBundle.analysis) : null;
        const resolvedAccuracy =
          updatedBundle && questionTopDomainAfter !== null
            ? questionTopDomainAfter === caseRecord.groundTruthDomain
              ? 1
              : 0
            : frontierTopDomain === caseRecord.groundTruthDomain
              ? 1
              : 0;

        rows.push({
          caseId: caseRecord.id,
          groundTruthDomain: caseRecord.groundTruthDomain,
          prefixDepth,
          conditionId,
          conditionLabel: CONDITION_LABELS[conditionId],
          inputText: text,
          usageMode: bundle.usageMode,
          canonicalRunId: bundle.run.id,
          cnlLineCount: bundle.canonicalLines.length,
          updateCnlLineCount: updatedBundle ? updatedBundle.canonicalLines.length : null,
          lexicalDomain,
          lexicalAccuracy: lexicalDomain === caseRecord.groundTruthDomain ? 1 : 0,
          singleTheoryDomain,
          singleTheoryAccuracy: singleTheoryDomain === caseRecord.groundTruthDomain ? 1 : 0,
          frontierTopDomain,
          frontierTopAccuracy: frontierTopDomain === caseRecord.groundTruthDomain ? 1 : 0,
          resolvedAccuracy,
          frontierRetainsTruth: frontierRetainsTruth ? 1 : 0,
          frontierDomains: bundle.analysis.neighborhood.domainDistribution
            .map((entry) => `${entry.domainId}:${roundNumber(entry.weight)}`)
            .join(';'),
          questionId: question?.id ?? null,
          questionPrompt: question?.prompt ?? null,
          goldAnswer,
          informationGain: question ? roundNumber(question.informationGain) : null,
          questionTopDomainAfter,
          questionTopAccuracyAfter: updatedBundle && questionTopDomainAfter === caseRecord.groundTruthDomain ? 1 : 0,
          rescuedByQuestion:
            updatedBundle &&
            frontierTopDomain !== caseRecord.groundTruthDomain &&
            frontierRetainsTruth &&
            questionTopDomainAfter === caseRecord.groundTruthDomain
              ? 1
              : 0,
          domainEntropyBefore: question ? roundNumber(bundle.analysis.neighborhood.domainEntropy) : null,
          domainEntropyAfter: updatedBundle ? roundNumber(updatedBundle.analysis.neighborhood.domainEntropy) : null,
          canonicalFamilies: bundle.canonicalFamilies.join(';')
        });
      }
    }
  }

  const summaryRows = aggregateRows(rows);
  const categories = summaryRows.map((row) => row.label);
  const baselineSvg = createGroupedBarChartSvg({
    title: 'Experiment 3: Baseline comparison under cue masking',
    categories,
    yMax: 1,
    series: [
      {
        label: 'Lexical baseline',
        color: '#6b7280',
        values: summaryRows.map((row) => row.lexicalAccuracy)
      },
      {
        label: 'Single theory',
        color: '#2563eb',
        values: summaryRows.map((row) => row.singleTheoryAccuracy)
      },
      {
        label: 'Frontier top',
        color: '#dc2626',
        values: summaryRows.map((row) => row.frontierTopAccuracy)
      },
      {
        label: 'Frontier + one question',
        color: '#059669',
        values: summaryRows.map((row) => row.resolvedAccuracy)
      }
    ]
  });
  const recoverySvg = createGroupedBarChartSvg({
    title: 'Experiment 3: Question recovery on ambiguous traces',
    categories,
    yMax: 1,
    series: [
      {
        label: 'Accuracy before question',
        color: '#7c3aed',
        values: summaryRows.map((row) => row.questionAccuracyBefore ?? 0)
      },
      {
        label: 'Accuracy after question',
        color: '#0f766e',
        values: summaryRows.map((row) => row.questionAccuracyAfter ?? 0)
      },
      {
        label: 'Rescued by questioning',
        color: '#ca8a04',
        values: summaryRows.map((row) => row.rescuedRate ?? 0)
      }
    ]
  });

  const summary = {
    experimentId: 'experiment3',
    title: 'Frontier Retention Under Cue Masking',
    usageContract: {
      api: 'analyzeEvidence',
      updateApi: 'applyEvidenceUpdate',
      stableSurface: 'canonical-cnl'
    },
    caseCount: cases.length,
    traceCount: rows.length,
    caseRows: rows,
    summaryRows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./baseline-summary.csv', outputDir),
    toCsv(summaryRows, [
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'case_count', value: (row) => row.caseCount },
      { header: 'lexical_accuracy', value: (row) => row.lexicalAccuracy },
      { header: 'single_theory_accuracy', value: (row) => row.singleTheoryAccuracy },
      { header: 'frontier_top_accuracy', value: (row) => row.frontierTopAccuracy },
      { header: 'resolved_accuracy', value: (row) => row.resolvedAccuracy },
      { header: 'frontier_retention_rate', value: (row) => row.frontierRetentionRate }
    ])
  );
  await writeFile(
    new URL('./question-recovery.csv', outputDir),
    toCsv(summaryRows, [
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'ambiguous_count', value: (row) => row.ambiguousCount },
      { header: 'accuracy_before_question', value: (row) => row.questionAccuracyBefore },
      { header: 'accuracy_after_question', value: (row) => row.questionAccuracyAfter },
      { header: 'rescued_rate', value: (row) => row.rescuedRate },
      { header: 'entropy_before_question', value: (row) => row.meanEntropyBeforeQuestion },
      { header: 'entropy_after_question', value: (row) => row.meanEntropyAfterQuestion }
    ])
  );
  await writeFile(
    new URL('./trace-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'ground_truth_domain', value: (row) => row.groundTruthDomain },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'cnl_line_count', value: (row) => row.cnlLineCount },
      { header: 'update_cnl_line_count', value: (row) => row.updateCnlLineCount },
      { header: 'lexical_domain', value: (row) => row.lexicalDomain },
      { header: 'lexical_accuracy', value: (row) => row.lexicalAccuracy },
      { header: 'single_theory_domain', value: (row) => row.singleTheoryDomain },
      { header: 'single_theory_accuracy', value: (row) => row.singleTheoryAccuracy },
      { header: 'frontier_top_domain', value: (row) => row.frontierTopDomain },
      { header: 'frontier_top_accuracy', value: (row) => row.frontierTopAccuracy },
      { header: 'resolved_accuracy', value: (row) => row.resolvedAccuracy },
      { header: 'frontier_retains_truth', value: (row) => row.frontierRetainsTruth },
      { header: 'frontier_domains', value: (row) => row.frontierDomains },
      { header: 'question_id', value: (row) => row.questionId },
      { header: 'gold_answer', value: (row) => row.goldAnswer },
      { header: 'information_gain', value: (row) => row.informationGain },
      { header: 'question_top_domain_after', value: (row) => row.questionTopDomainAfter },
      { header: 'question_top_accuracy_after', value: (row) => row.questionTopAccuracyAfter },
      { header: 'rescued_by_question', value: (row) => row.rescuedByQuestion },
      { header: 'domain_entropy_before', value: (row) => row.domainEntropyBefore },
      { header: 'domain_entropy_after', value: (row) => row.domainEntropyAfter },
      { header: 'canonical_families', value: (row) => row.canonicalFamilies }
    ])
  );
  await writeFile(new URL('./baseline-accuracy.svg', outputDir), baselineSvg);
  await writeFile(new URL('./question-recovery.svg', outputDir), recoverySvg);
  await writeFile(new URL('./results.md', outputDir), buildResultsMarkdown(summaryRows, rows.length));

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment3-baseline-accuracy.svg', assetDir), baselineSvg);
    await writeFile(new URL('./experiment3-question-recovery.svg', assetDir), recoverySvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment3();
}

export { runExperiment3 };
