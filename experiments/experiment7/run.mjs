import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { roundNumber, toCsv, toMarkdownTable } from '../../src/index.mjs';
import { createLineChartSvg } from '../../src/reporting/svgCharts.mjs';
import { runQuestionBudget, topDomain } from '../shared/benchmarkAnalysis.mjs';
import { readBenchmarkCases } from '../shared/benchmarkDataset.mjs';

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = `${row.conditionId}:${row.questionPolicy}:${row.budget}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  return [...grouped.entries()].map(([, groupRows]) => {
    const initialWrong = groupRows.filter((row) => row.initialCorrect === 0);
    const conditionId = groupRows[0].conditionId;
    const questionPolicy = groupRows[0].questionPolicy;
    const budget = groupRows[0].budget;

    return {
      conditionId,
      questionPolicy,
      budget,
      traceCount: groupRows.length,
      finalAccuracy: roundNumber(average(groupRows.map((row) => row.finalCorrect))),
      truthRetentionRate: roundNumber(average(groupRows.map((row) => row.truthRetention))),
      meanEntropy: roundNumber(average(groupRows.map((row) => row.finalEntropy))),
      meanQuestionsUsed: roundNumber(average(groupRows.map((row) => row.questionsUsed))),
      meanInformationGain: roundNumber(average(groupRows.map((row) => row.meanInformationGain))),
      meanEntropyReductionPerQuestion: roundNumber(
        average(groupRows.map((row) => row.meanEntropyReductionPerQuestion))
      ),
      harmfulQuestionRate: roundNumber(average(groupRows.map((row) => row.harmfulQuestionRate))),
      rescuedFromWrongRate: roundNumber(
        initialWrong.length === 0 ? 0 : average(initialWrong.map((row) => row.rescuedFromWrong))
      )
    };
  });
}

function buildResultsMarkdown(cleanRows, noisyRows, adverseRows, adverseMechanicsRows) {
  return `# Experiment 7: Multi-step questioning and recoverability

## Problem and Objective
This experiment evaluates whether the frontier supports useful recovery over a question budget of 0, 1, 2, and 3 answered questions. It compares three question policies: information gain, random selection, and a cheaper symbolic top-domain heuristic. The adverse-answer condition uses a worst-branch policy: at each step it chooses the answer that most damages correctness and truth retention, breaking ties by preferring higher post-update entropy and stronger misleading confidence.

## Clean condition
${toMarkdownTable(cleanRows, [
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Accuracy', value: (row) => row.finalAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Entropy', value: (row) => row.meanEntropy },
  { header: 'Rescued', value: (row) => row.rescuedFromWrongRate }
])}

## Masked evidence with noisy answers
${toMarkdownTable(noisyRows, [
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Accuracy', value: (row) => row.finalAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Entropy', value: (row) => row.meanEntropy },
  { header: 'Rescued', value: (row) => row.rescuedFromWrongRate }
])}

## Adverse condition
${toMarkdownTable(adverseRows, [
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Accuracy', value: (row) => row.finalAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Entropy', value: (row) => row.meanEntropy },
  { header: 'Rescued', value: (row) => row.rescuedFromWrongRate }
])}

## Adversarial failure mechanics
${toMarkdownTable(adverseMechanicsRows, [
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Mean IG', value: (row) => row.meanInformationGain },
  { header: 'Entropy delta/question', value: (row) => row.meanEntropyReductionPerQuestion },
  { header: 'Harmful question rate', value: (row) => row.harmfulQuestionRate }
])}

## Interpretation
The key curves are accuracy versus question budget, entropy reduction per question, and the fraction of initially wrong traces that become correct later. Under adversarial answers the frontier still contracts, but the failure mode becomes visible: entropy can fall while truth retention falls too. That separates useful contraction from toxic contraction and makes the limitation explicit instead of hiding it behind one aggregate accuracy curve.
`;
}

function buildFailureAnalysisMarkdown(worstRows, adverseMechanicsRows) {
  return `# Experiment 7 failure analysis

## Adversarial mechanics summary
${toMarkdownTable(adverseMechanicsRows, [
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Accuracy', value: (row) => row.finalAccuracy },
  { header: 'Truth retained', value: (row) => row.truthRetentionRate },
  { header: 'Mean IG', value: (row) => row.meanInformationGain },
  { header: 'Harmful rate', value: (row) => row.harmfulQuestionRate }
])}

## Worst recoverability traces
${toMarkdownTable(worstRows, [
  { header: 'Case', value: (row) => row.caseId },
  { header: 'Condition', value: (row) => row.conditionId },
  { header: 'Policy', value: (row) => row.questionPolicy },
  { header: 'Budget', value: (row) => row.budget },
  { header: 'Initial', value: (row) => row.initialPredictedDomain },
  { header: 'Final', value: (row) => row.finalPredictedDomain },
  { header: 'Questions', value: (row) => row.questionTrace || '-' },
  { header: 'Truth retained', value: (row) => row.truthRetention }
])}
`;
}

async function runExperiment7({ assetDir = null } = {}) {
  const benchmarkCases = await readBenchmarkCases();
  const evaluationCases = benchmarkCases.filter(
    (caseRecord) => caseRecord.split === 'test' && ['paraphrased', 'noisy'].includes(caseRecord.stratum)
  );
  const outputDir = new URL('./', import.meta.url);
  const conditions = [
    {
      id: 'clean-gold',
      label: 'Clean evidence with gold answers',
      masked: false,
      answerMode: 'gold'
    },
    {
      id: 'masked-noisy',
      label: 'Masked evidence with noisy answers',
      masked: true,
      answerMode: 'noisy'
    },
    {
      id: 'masked-adversarial',
      label: 'Masked evidence with adversarial answers',
      masked: true,
      answerMode: 'adversarial'
    }
  ];
  const questionPolicies = ['information-gain', 'top-domain', 'random'];
  const budgets = [0, 1, 2, 3];
  const rows = [];
  const stepRows = [];

  for (const caseRecord of evaluationCases) {
    for (const prefixDepth of [2, 3]) {
      for (const condition of conditions) {
        for (const questionPolicy of questionPolicies) {
          for (const budget of budgets) {
            const run = runQuestionBudget(caseRecord, {
              prefixDepth,
              budget,
              questionPolicy,
              answerMode: condition.answerMode,
              masked: condition.masked,
              observerId: 'rich'
            });
            const initialPredicted = topDomain(run.initialBundle.analysis);
            const finalPredicted = topDomain(run.finalBundle.analysis);
            const initialCorrect = initialPredicted === caseRecord.groundTruthDomain ? 1 : 0;
            const finalCorrect = finalPredicted === caseRecord.groundTruthDomain ? 1 : 0;
            const truthRetained = run.finalBundle.analysis.neighborhood.frontier.some(
              (theory) => theory.domainId === caseRecord.groundTruthDomain
            );

            rows.push({
              caseId: caseRecord.id,
              sourceCaseId: caseRecord.sourceCaseId,
              stratum: caseRecord.stratum,
              prefixDepth,
              conditionId: condition.id,
              conditionLabel: condition.label,
              questionPolicy,
              budget,
              questionsUsed: run.steps.length,
              usageMode: run.finalBundle.usageMode,
              canonicalRunId: run.finalBundle.run.id,
              initialPredictedDomain: initialPredicted,
              finalPredictedDomain: finalPredicted,
              initialCorrect,
              finalCorrect,
              truthRetention: truthRetained ? 1 : 0,
              rescuedFromWrong: initialCorrect === 0 && finalCorrect === 1 ? 1 : 0,
              initialEntropy: roundNumber(run.initialBundle.analysis.neighborhood.domainEntropy),
              finalEntropy: roundNumber(run.finalBundle.analysis.neighborhood.domainEntropy),
              meanInformationGain: roundNumber(
                average(run.steps.map((step) => step.informationGain ?? 0))
              ),
              meanEntropyReductionPerQuestion: roundNumber(
                average(run.steps.map((step) => step.entropyReduction ?? 0))
              ),
              harmfulQuestionRate: roundNumber(
                average(
                  run.steps.map((step) =>
                    step.entropyReduction > 0 && step.truthRetainedAfter === 0 && step.finalCorrect === 0 ? 1 : 0
                  )
                )
              ),
              questionTrace: run.steps.map((step) => `${step.questionId}:${step.observedAnswer}`).join(' | ')
            });

            for (const step of run.steps) {
              stepRows.push({
                caseId: caseRecord.id,
                conditionId: condition.id,
                questionPolicy,
                budget,
                prefixDepth,
                stepIndex: step.stepIndex,
                questionId: step.questionId,
                observedAnswer: step.observedAnswer,
                informationGain: roundNumber(step.informationGain),
                predictedDomainBefore: step.predictedDomainBefore,
                predictedDomainAfter: step.predictedDomainAfter,
                domainEntropyBefore: roundNumber(step.domainEntropyBefore),
                domainEntropyAfter: roundNumber(step.domainEntropyAfter),
                entropyReduction: roundNumber(step.entropyReduction),
                truthRetainedAfter: step.truthRetainedAfter,
                finalCorrectAfterStep: step.finalCorrect
              });
            }
          }
        }
      }
    }
  }

  const summaryRows = aggregateRows(rows).sort((left, right) => {
    const conditionDelta = left.conditionId.localeCompare(right.conditionId);

    if (conditionDelta !== 0) {
      return conditionDelta;
    }

    const policyDelta = left.questionPolicy.localeCompare(right.questionPolicy);

    if (policyDelta !== 0) {
      return policyDelta;
    }

    return left.budget - right.budget;
  });
  const cleanRows = summaryRows.filter((row) => row.conditionId === 'clean-gold');
  const noisyRows = summaryRows.filter((row) => row.conditionId === 'masked-noisy');
  const adverseRows = summaryRows.filter((row) => row.conditionId === 'masked-adversarial');
  const adverseMechanicsRows = adverseRows.map((row) => ({
    questionPolicy: row.questionPolicy,
    budget: row.budget,
    finalAccuracy: row.finalAccuracy,
    truthRetentionRate: row.truthRetentionRate,
    meanInformationGain: row.meanInformationGain,
    meanEntropyReductionPerQuestion: row.meanEntropyReductionPerQuestion,
    harmfulQuestionRate: row.harmfulQuestionRate
  }));
  const failureRows = [...rows]
    .filter((row) => row.conditionId === 'masked-adversarial')
    .sort((left, right) => {
      if (left.finalCorrect !== right.finalCorrect) {
        return left.finalCorrect - right.finalCorrect;
      }

      if (left.truthRetention !== right.truthRetention) {
        return left.truthRetention - right.truthRetention;
      }

      if (left.finalEntropy !== right.finalEntropy) {
        return left.finalEntropy - right.finalEntropy;
      }

      return right.questionsUsed - left.questionsUsed;
    })
    .slice(0, 12);
  const accuracySvg = createLineChartSvg({
    title: 'Experiment 7: Accuracy versus question budget under adverse evidence',
    xValues: budgets,
    yMax: 1,
    series: questionPolicies.map((questionPolicy, index) => {
      const colorPalette = ['#2563eb', '#7c3aed', '#6b7280'];
      return {
        label: questionPolicy,
        color: colorPalette[index],
        points: budgets.map((budget) => ({
          x: budget,
          y:
            summaryRows.find(
              (row) =>
                row.conditionId === 'masked-adversarial' &&
                row.questionPolicy === questionPolicy &&
                row.budget === budget
            )?.finalAccuracy ?? 0
        }))
      };
    })
  });
  const entropySvg = createLineChartSvg({
    title: 'Experiment 7: Entropy reduction versus question budget under adverse evidence',
    xValues: budgets,
    yMax: 1.5,
    series: questionPolicies.map((questionPolicy, index) => {
      const colorPalette = ['#2563eb', '#7c3aed', '#6b7280'];
      return {
        label: questionPolicy,
        color: colorPalette[index],
        points: budgets.map((budget) => ({
          x: budget,
          y:
            summaryRows.find(
              (row) =>
                row.conditionId === 'masked-adversarial' &&
                row.questionPolicy === questionPolicy &&
                row.budget === budget
            )?.meanEntropy ?? 0
        }))
      };
    })
  });

  const summary = {
    experimentId: 'experiment7',
    title: 'Multi-step questioning and recoverability',
    evaluationCaseCount: evaluationCases.length,
    traceCount: rows.length,
    adversarialAnswerStrategy:
      'worst-branch answer minimizes correctness and truth retention, then maximizes residual entropy and misleading confidence',
    cleanRows,
    noisyRows,
    adverseRows,
    summaryRows,
    stepRows,
    caseRows: rows
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL('./summary.json', outputDir), JSON.stringify(summary, null, 2));
  await writeFile(
    new URL('./summary.csv', outputDir),
    toCsv(summaryRows, [
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'question_policy', value: (row) => row.questionPolicy },
      { header: 'budget', value: (row) => row.budget },
      { header: 'trace_count', value: (row) => row.traceCount },
      { header: 'final_accuracy', value: (row) => row.finalAccuracy },
      { header: 'truth_retention_rate', value: (row) => row.truthRetentionRate },
      { header: 'mean_entropy', value: (row) => row.meanEntropy },
      { header: 'mean_questions_used', value: (row) => row.meanQuestionsUsed },
      { header: 'mean_information_gain', value: (row) => row.meanInformationGain },
      { header: 'mean_entropy_reduction_per_question', value: (row) => row.meanEntropyReductionPerQuestion },
      { header: 'harmful_question_rate', value: (row) => row.harmfulQuestionRate },
      { header: 'rescued_from_wrong_rate', value: (row) => row.rescuedFromWrongRate }
    ])
  );
  await writeFile(
    new URL('./trace-details.csv', outputDir),
    toCsv(rows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'source_case_id', value: (row) => row.sourceCaseId },
      { header: 'stratum', value: (row) => row.stratum },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'question_policy', value: (row) => row.questionPolicy },
      { header: 'budget', value: (row) => row.budget },
      { header: 'questions_used', value: (row) => row.questionsUsed },
      { header: 'usage_mode', value: (row) => row.usageMode },
      { header: 'canonical_run_id', value: (row) => row.canonicalRunId },
      { header: 'initial_predicted_domain', value: (row) => row.initialPredictedDomain },
      { header: 'final_predicted_domain', value: (row) => row.finalPredictedDomain },
      { header: 'initial_correct', value: (row) => row.initialCorrect },
      { header: 'final_correct', value: (row) => row.finalCorrect },
      { header: 'truth_retention', value: (row) => row.truthRetention },
      { header: 'rescued_from_wrong', value: (row) => row.rescuedFromWrong },
      { header: 'initial_entropy', value: (row) => row.initialEntropy },
      { header: 'final_entropy', value: (row) => row.finalEntropy },
      { header: 'mean_information_gain', value: (row) => row.meanInformationGain },
      { header: 'mean_entropy_reduction_per_question', value: (row) => row.meanEntropyReductionPerQuestion },
      { header: 'harmful_question_rate', value: (row) => row.harmfulQuestionRate },
      { header: 'question_trace', value: (row) => row.questionTrace }
    ])
  );
  await writeFile(
    new URL('./step-details.csv', outputDir),
    toCsv(stepRows, [
      { header: 'case_id', value: (row) => row.caseId },
      { header: 'condition_id', value: (row) => row.conditionId },
      { header: 'question_policy', value: (row) => row.questionPolicy },
      { header: 'budget', value: (row) => row.budget },
      { header: 'prefix_depth', value: (row) => row.prefixDepth },
      { header: 'step_index', value: (row) => row.stepIndex },
      { header: 'question_id', value: (row) => row.questionId },
      { header: 'observed_answer', value: (row) => row.observedAnswer },
      { header: 'information_gain', value: (row) => row.informationGain },
      { header: 'predicted_domain_before', value: (row) => row.predictedDomainBefore },
      { header: 'predicted_domain_after', value: (row) => row.predictedDomainAfter },
      { header: 'domain_entropy_before', value: (row) => row.domainEntropyBefore },
      { header: 'domain_entropy_after', value: (row) => row.domainEntropyAfter },
      { header: 'entropy_reduction', value: (row) => row.entropyReduction },
      { header: 'truth_retained_after', value: (row) => row.truthRetainedAfter },
      { header: 'final_correct_after_step', value: (row) => row.finalCorrectAfterStep }
    ])
  );
  await writeFile(new URL('./accuracy-vs-budget.svg', outputDir), accuracySvg);
  await writeFile(new URL('./entropy-vs-budget.svg', outputDir), entropySvg);
  await writeFile(
    new URL('./results.md', outputDir),
    buildResultsMarkdown(cleanRows, noisyRows, adverseRows, adverseMechanicsRows)
  );
  await writeFile(
    new URL('./failure-analysis.md', outputDir),
    buildFailureAnalysisMarkdown(failureRows, adverseMechanicsRows)
  );

  if (assetDir) {
    await mkdir(assetDir, { recursive: true });
    await writeFile(new URL('./experiment7-accuracy.svg', assetDir), accuracySvg);
    await writeFile(new URL('./experiment7-entropy.svg', assetDir), entropySvg);
  }

  return summary;
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  await runExperiment7();
}

export { runExperiment7 };
