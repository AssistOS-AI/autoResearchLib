import { analyzeText, applyDiscriminatingAnswer, applyQuestionToAnalysis } from '../pipeline/analyze.mjs';
import { roundNumber } from '../reporting/tabular.mjs';

const SCORE_DIMENSIONS = [
  'evidenceCoverage',
  'predictiveAdequacy',
  'compressionUtility',
  'compositionalSharpness',
  'stability',
  'alignmentUtility',
  'total'
];

function formatNumber(value) {
  return Number.isFinite(value) ? roundNumber(value) : value;
}

function formatFieldValue(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((entry) => String(entry)));
  }

  if (typeof value === 'number') {
    return String(formatNumber(value));
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return JSON.stringify(String(value));
}

function cnlLine(keyword, fields = {}) {
  const serializedFields = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${formatFieldValue(value)}`);

  return serializedFields.length > 0 ? `${keyword} ${serializedFields.join(' ')}` : keyword;
}

function sanitizeToken(value, fallback = 'run') {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function normalizeNonNegativeInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return null;
  }

  return Math.max(0, Math.floor(normalized));
}

function normalizeBranchTransition(value) {
  return value && typeof value === 'object' ? { ...value } : null;
}

function buildSegmentSpans(segments) {
  const records = [];
  let start = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const text = segments[index];
    const end = Math.max(start, start + text.length - 1);

    records.push({
      id: `SEG${index + 1}`,
      text,
      span: `${start}-${end}`
    });

    start = end + 2;
  }

  return records;
}

function normalizeInputObject(input) {
  if (typeof input === 'string') {
    return {
      text: input,
      segments: [input],
      metadata: {},
      sourceId: 'input',
      sourceSpan: null,
      mode: 'text'
    };
  }

  if (Array.isArray(input)) {
    return {
      text: input.join(' '),
      segments: [...input],
      metadata: {},
      sourceId: 'input',
      sourceSpan: null,
      mode: 'segments'
    };
  }

  if (input && typeof input === 'object') {
    const segments = Array.isArray(input.segments) ? [...input.segments] : null;
    const text = typeof input.text === 'string' ? input.text : segments ? segments.join(' ') : '';

    return {
      text,
      segments: segments ?? (text ? [text] : []),
      metadata: input.metadata ?? {},
      sourceId: input.sourceId ?? input.documentId ?? input.metadata?.sourceId ?? 'input',
      sourceSpan: input.sourceSpan ?? input.metadata?.sourceSpan ?? null,
      mode: segments ? 'segments' : 'text'
    };
  }

  throw new Error('Evidence input must be a string, an array of segments, or an object with text/segments.');
}

function prepareEvidenceInput(input) {
  const normalized = normalizeInputObject(input);
  const segmentSpans = buildSegmentSpans(normalized.segments);
  const defaultSpan =
    normalized.text.length > 0 ? `0-${Math.max(0, normalized.text.length - 1)}` : '0-0';

  return {
    ...normalized,
    sourceSpan: normalized.sourceSpan ?? defaultSpan,
    segmentSpans
  };
}

function createRunId(inputRecord, observerId, metadata = {}) {
  const sourceToken = sanitizeToken(inputRecord.sourceId, 'input');
  const prefixToken = metadata.prefixDepth ? `p${metadata.prefixDepth}` : null;
  const observerToken = sanitizeToken(observerId, 'observer');

  return [sourceToken, prefixToken, observerToken].filter(Boolean).join('_');
}

function buildRunRecord(inputRecord, options = {}) {
  const observerId = options.observerId ?? 'coarse';
  const queryBudgetLimit = normalizeNonNegativeInteger(options.queryBudgetLimit ?? options.queryBudget);

  return {
    id: options.runId ?? createRunId(inputRecord, observerId, inputRecord.metadata),
    observerId,
    maxHypotheses: options.maxHypotheses ?? 4,
    frontierLimit: options.frontierLimit ?? 8,
    queryBudgetLimit,
    queryBudgetConsumed: normalizeNonNegativeInteger(options.queryBudgetConsumed) ?? 0,
    sourceId: inputRecord.sourceId,
    sourceSpan: inputRecord.sourceSpan,
    metadata: inputRecord.metadata,
    mode: inputRecord.mode,
    parentRunId: options.parentRunId ?? null,
    branchTransition: normalizeBranchTransition(options.branchTransition),
    preparation: options.preparation ?? null
  };
}

function buildUpdatedRunRecord(bundle, options, selectedQuestion, observedAnswer) {
  const previousRun = bundle.run;
  const nextRunId = options.runId ?? previousRun.id;
  const isBranch = options.parentRunId !== undefined || nextRunId !== previousRun.id;
  const parentRunId = options.parentRunId ?? (isBranch ? previousRun.id : previousRun.parentRunId ?? null);
  const queryBudgetLimit =
    normalizeNonNegativeInteger(options.queryBudgetLimit ?? options.queryBudget) ?? previousRun.queryBudgetLimit ?? null;
  const queryBudgetConsumed = previousRun.queryBudgetConsumed + (selectedQuestion ? 1 : 0);

  return {
    ...previousRun,
    id: nextRunId,
    frontierLimit: options.frontierLimit ?? bundle.run.frontierLimit,
    queryBudgetLimit,
    queryBudgetConsumed,
    parentRunId,
    branchTransition:
      normalizeBranchTransition(options.branchTransition) ??
      (isBranch
        ? {
            kind: selectedQuestion ? 'question-answer' : 'frontier-update',
            questionId: selectedQuestion?.id ?? null,
            observedAnswer: selectedQuestion ? observedAnswer : null
          }
        : previousRun.branchTransition ?? null)
  };
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sortSources(sources) {
  return [...sources].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function sortCues(cues) {
  return [...cues].sort((left, right) => {
    const domainDelta = (left.domainId ?? 'shared').localeCompare(right.domainId ?? 'shared');

    if (domainDelta !== 0) {
      return domainDelta;
    }

    const evidenceDelta = left.evidenceType.localeCompare(right.evidenceType);

    if (evidenceDelta !== 0) {
      return evidenceDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

function sortTheories(theories) {
  return [...theories].sort((left, right) => left.id.localeCompare(right.id));
}

function sortTransformations(transformations) {
  return [...transformations].sort((left, right) => {
    const typeDelta = left.type.localeCompare(right.type);

    if (typeDelta !== 0) {
      return typeDelta;
    }

    const fromDelta = left.from.localeCompare(right.from);

    if (fromDelta !== 0) {
      return fromDelta;
    }

    return left.to.localeCompare(right.to);
  });
}

function sortEquivalenceClasses(classes) {
  return [...classes].sort((left, right) => left.id.localeCompare(right.id));
}

function frontierIds(analysis) {
  return analysis.neighborhood.frontier.map((theory) => theory.id);
}

function analysisTraceMetrics(analysis) {
  return {
    domainEntropy: analysis.neighborhood.domainEntropy,
    theoryEntropy: analysis.neighborhood.theoryEntropy,
    frontierWidth: analysis.neighborhood.frontier.length,
    topDomain: analysis.neighborhood.domainDistribution[0]?.domainId ?? null,
    topTheory: analysis.neighborhood.frontier[0]?.id ?? null
  };
}

function emitRunStartTrace(traceCollector, inputRecord, runRecord) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  traceCollector.setContext?.({
    runId: runRecord.id,
    parentRunId: runRecord.parentRunId ?? null
  });

  const sourceSnapshotId = traceCollector.snapshot(
    'source',
    {
      run: runRecord,
      input: {
        sourceId: inputRecord.sourceId,
        sourceSpan: inputRecord.sourceSpan,
        mode: inputRecord.mode,
        metadata: inputRecord.metadata,
        segments: inputRecord.segmentSpans
      }
    },
    {
      summary: 'Source intake'
    }
  );

  traceCollector.emit({
    stage: 'source',
    kind: 'run.started',
    importance: 'high',
    summary: `Run ${runRecord.id} started`,
    objectRefs: {
      runIds: [runRecord.id]
    },
    payload: {
      observerId: runRecord.observerId,
      sourceId: runRecord.sourceId
    },
    snapshotId: sourceSnapshotId
  });

  for (const segment of inputRecord.segmentSpans) {
    traceCollector.emit({
      stage: 'source',
      kind: 'source.segment.loaded',
      summary: `Loaded ${segment.id}`,
      objectRefs: {
        runIds: [runRecord.id],
        segmentIds: [segment.id]
      },
      payload: {
        span: segment.span,
        text: segment.text
      },
      snapshotId: sourceSnapshotId
    });
  }
}

function emitCompletedTrace(traceCollector, inputRecord, runRecord, analysis, serialized) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const completedSnapshotId = traceCollector.snapshot(
    'completed',
    {
      run: runRecord,
      input: {
        sourceId: inputRecord.sourceId,
        sourceSpan: inputRecord.sourceSpan,
        metadata: inputRecord.metadata
      },
      analysis: {
        frontierIds: frontierIds(analysis),
        domainDistribution: analysis.neighborhood.domainDistribution,
        recommendedQuestion: analysis.neighborhood.recommendedQuestion,
        questionUpdate: analysis.questionUpdate ?? null
      },
      canonical: {
        lineCount: serialized.canonicalLines.length,
        families: serialized.canonicalFamilies,
        cnl: serialized.canonicalCnl
      }
    },
    {
      summary: 'Completed materialization',
      metrics: analysisTraceMetrics(analysis)
    }
  );

  traceCollector.emit({
    stage: 'completed',
    kind: 'completed.materialized',
    summary: 'Canonical CNL bundle materialized',
    objectRefs: {
      runIds: [runRecord.id],
      theoryIds: frontierIds(analysis),
      questionIds: analysis.neighborhood.recommendedQuestion ? [analysis.neighborhood.recommendedQuestion.id] : []
    },
    payload: {
      canonicalFamilies: serialized.canonicalFamilies,
      canonicalLineCount: serialized.canonicalLines.length
    },
    metrics: analysisTraceMetrics(analysis),
    snapshotId: completedSnapshotId
  });

  traceCollector.emit({
    stage: 'completed',
    kind: 'run.completed',
    importance: 'high',
    summary: `Run ${runRecord.id} completed`,
    objectRefs: {
      runIds: [runRecord.id]
    },
    payload: {
      canonicalLineCount: serialized.canonicalLines.length
    },
    snapshotId: completedSnapshotId
  });
}

function serializePreparation(lines, preparation) {
  lines.push(cnlLine('PREPARATION', { status: preparation.status, task: 'ingestion-normalization' }));

  for (const entity of sortStrings(preparation.canonicalEntities ?? [])) {
    lines.push(cnlLine('PREPARATION_ITEM', { kind: 'entity', status: 'inferred', value: entity }));
  }

  for (const event of sortStrings(preparation.canonicalEvents ?? [])) {
    lines.push(cnlLine('PREPARATION_ITEM', { kind: 'event', status: 'inferred', value: event }));
  }

  for (const relation of sortStrings(preparation.canonicalRelations ?? [])) {
    lines.push(cnlLine('PREPARATION_ITEM', { kind: 'relation', status: 'inferred', value: relation }));
  }

  for (const note of sortStrings(preparation.notes ?? [])) {
    lines.push(cnlLine('PREPARATION_NOTE', { text: note }));
  }
}

function serializeAnalysisToCNL({ analysis, inputRecord, runRecord, previousAnalysis = null }) {
  const lines = [];

  lines.push(cnlLine('RUN', { id: runRecord.id, parent: runRecord.parentRunId }));
  lines.push(
    cnlLine('SOURCE', {
      doc: runRecord.sourceId,
      span: runRecord.sourceSpan,
      mode: runRecord.mode
    })
  );

  for (const segment of inputRecord.segmentSpans) {
    lines.push(cnlLine('SEGMENT', { id: segment.id, span: segment.span }));
  }

  lines.push(cnlLine('OBSERVER', { id: analysis.observer.id }));
  lines.push(
    cnlLine('BUDGET', {
      hypotheses: runRecord.maxHypotheses,
      theories: runRecord.frontierLimit,
      query_limit: runRecord.queryBudgetLimit ?? 'unbounded',
      query_used: runRecord.queryBudgetConsumed ?? 0
    })
  );

  for (const [key, value] of Object.entries(runRecord.metadata ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    lines.push(cnlLine('CONTEXT', { key, value }));
  }

  if (runRecord.preparation) {
    serializePreparation(lines, runRecord.preparation);
  }

  for (const hypothesis of [...analysis.hypotheses].sort((left, right) => left.id.localeCompare(right.id))) {
    lines.push('');
    lines.push(
      cnlLine('HYPOTHESIS', {
        id: hypothesis.id,
        focus: hypothesis.focusDomain ?? 'all'
      })
    );

    for (const cue of sortCues([...hypothesis.explicitCues, ...hypothesis.inferredCues])) {
      lines.push(
        cnlLine('OBSERVATION', {
          hypothesis: hypothesis.id,
          status: cue.evidenceType,
          cue: cue.id,
          label: cue.label,
          domain: cue.domainId ?? 'shared',
          kind: cue.kind,
          specificity: cue.specificity,
          weight: cue.weight
        })
      );

      for (const source of sortSources(cue.sources ?? [])) {
        const provenanceFields =
          typeof source === 'string'
            ? { source }
            : {
                kind: source.kind,
                source: source.text ?? source.ruleId ?? source.segmentId ?? source.kind,
                segment: source.segmentId,
                span: source.span,
                rule: source.ruleId
              };
        lines.push(cnlLine('PROVENANCE', { hypothesis: hypothesis.id, cue: cue.id, ...provenanceFields }));
      }
    }

    for (const [domainId, value] of Object.entries(hypothesis.supportByDomain).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      lines.push(cnlLine('HYPOTHESIS_SUPPORT', { hypothesis: hypothesis.id, domain: domainId, value }));
    }

    lines.push(
      cnlLine('HYPOTHESIS_CONFIDENCE', {
        hypothesis: hypothesis.id,
        coverage: hypothesis.confidenceProfile.coverage,
        ambiguity: hypothesis.confidenceProfile.ambiguity
      })
    );

    for (const domainId of sortStrings(hypothesis.ambiguities ?? [])) {
      lines.push(cnlLine('AMBIGUITY', { hypothesis: hypothesis.id, domain: domainId }));
    }
  }

  for (const theory of sortTheories(analysis.neighborhood.theories)) {
    lines.push('');
    lines.push(
      cnlLine('THEORY', {
        id: theory.id,
        from: theory.hypothesisId,
        domain: theory.domainId,
        variant: theory.variant
      })
    );
    lines.push(
      cnlLine('SCHEMA', {
        theory: theory.id,
        roles: theory.stateSchema.roles,
        states: theory.stateSchema.states
      })
    );

    for (const state of sortStrings(theory.matchedStates ?? [])) {
      lines.push(cnlLine('MATCHED_STATE', { theory: theory.id, state }));
    }

    for (const rule of sortStrings(theory.rewriteTemplates ?? [])) {
      lines.push(cnlLine('RULE', { theory: theory.id, template: rule }));
    }

    for (const invariant of sortStrings(theory.invariants ?? [])) {
      lines.push(cnlLine('INVARIANT', { theory: theory.id, text: invariant }));
    }

    for (const rule of sortStrings(theory.compositionRules ?? [])) {
      lines.push(cnlLine('COMPOSITION', { theory: theory.id, rule }));
    }

    lines.push(cnlLine('SUPPORT', { theory: theory.id, hypothesis: theory.hypothesisId }));

    for (const cue of sortCues(theory.matchedCues ?? [])) {
      lines.push(
        cnlLine('THEORY_EVIDENCE', {
          theory: theory.id,
          cue: cue.id,
          status: cue.evidenceType,
          domain: cue.domainId ?? 'shared'
        })
      );
    }

    for (const dimension of SCORE_DIMENSIONS) {
      lines.push(
        cnlLine('SCORE', {
          theory: theory.id,
          dimension,
          value: theory.scoreProfile[dimension]
        })
      );
    }
  }

  lines.push('');

  for (const transformation of sortTransformations(analysis.neighborhood.transformations ?? [])) {
    lines.push(cnlLine('TRANSFORM', transformation));
  }

  for (const equivalenceClass of sortEquivalenceClasses(analysis.neighborhood.equivalenceClasses ?? [])) {
    lines.push(
      cnlLine('EQUIVALENCE', {
        id: equivalenceClass.id,
        theories: sortStrings(equivalenceClass.theoryIds ?? []),
        domains: sortStrings(equivalenceClass.domains ?? []),
        signature: equivalenceClass.signature
      })
    );
  }

  for (const invariant of sortStrings(analysis.neighborhood.robustInvariants ?? [])) {
    lines.push(cnlLine('CONSEQUENCE', { kind: 'robust', text: invariant }));
  }

  for (const consequenceEntry of [...(analysis.neighborhood.theorySensitiveConsequences ?? [])].sort((left, right) =>
    left.theoryId.localeCompare(right.theoryId)
  )) {
    for (const consequence of sortStrings(consequenceEntry.consequences ?? [])) {
      lines.push(
        cnlLine('CONSEQUENCE', {
          kind: 'theory-sensitive',
          theory: consequenceEntry.theoryId,
          domain: consequenceEntry.domainId,
          text: consequence
        })
      );
    }
  }

  lines.push('');
  lines.push(
    cnlLine('FRONTIER', {
      theories: frontierIds(analysis),
      domains: analysis.neighborhood.domainDistribution.map((entry) => entry.domainId),
      domain_entropy: analysis.neighborhood.domainEntropy,
      theory_entropy: analysis.neighborhood.theoryEntropy
    })
  );

  for (const [index, member] of analysis.neighborhood.theoryDistribution.entries()) {
    lines.push(
      cnlLine('FRONTIER_MEMBER', {
        rank: index + 1,
        theory: member.id,
        domain: member.domainId,
        weight: member.weight
      })
    );
  }

  for (const domainEntry of analysis.neighborhood.domainDistribution) {
    lines.push(cnlLine('DOMAIN_WEIGHT', { domain: domainEntry.domainId, weight: domainEntry.weight }));
  }

  if (analysis.neighborhood.recommendedQuestion) {
    const question = analysis.neighborhood.recommendedQuestion;

    lines.push(
      cnlLine('QUESTION', {
        id: question.id,
        cue: question.cue,
        prompt: question.prompt,
        expected_gain: question.informationGain,
        prior_entropy: question.priorEntropy,
        expected_entropy: question.expectedEntropy
      })
    );

    for (const answerClass of sortStrings(question.answerClasses ?? [])) {
      lines.push(cnlLine('QUESTION_CLASS', { question: question.id, answer: answerClass }));
    }

    for (const [domainId, answer] of Object.entries(question.predictedAnswersByDomain ?? {}).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      lines.push(cnlLine('QUESTION_ANSWER', { question: question.id, domain: domainId, answer }));
    }

    for (const partition of [...(question.answerPartitions ?? [])].sort((left, right) =>
      left.answer.localeCompare(right.answer)
    )) {
      lines.push(
        cnlLine('QUESTION_PARTITION', {
          question: question.id,
          answer: partition.answer,
          domains: partition.domains ?? [],
          weight: partition.weight
        })
      );
    }
  }

  for (const alignment of [...(analysis.alignments ?? [])].sort((left, right) => left.theoryId.localeCompare(right.theoryId))) {
    lines.push(
      cnlLine('ALIGNMENT', {
        theory: alignment.theoryId,
        domain: alignment.domainId,
        title: alignment.title,
        summary: alignment.summary
      })
    );
  }

  if (analysis.questionUpdate) {
    lines.push('');
    lines.push(
      cnlLine('UPDATE', {
        question: analysis.questionUpdate.questionId,
        answer: analysis.questionUpdate.observedAnswer,
        domain_entropy_before: analysis.questionUpdate.domainEntropyBefore,
        domain_entropy_after: analysis.questionUpdate.domainEntropyAfter,
        theory_entropy_before: analysis.questionUpdate.theoryEntropyBefore,
        theory_entropy_after: analysis.questionUpdate.theoryEntropyAfter
      })
    );

    if (previousAnalysis) {
      const previousFrontier = new Set(frontierIds(previousAnalysis));
      const currentFrontier = frontierIds(analysis);
      const dropped = [...previousFrontier].filter((theoryId) => !currentFrontier.includes(theoryId));
      const added = currentFrontier.filter((theoryId) => !previousFrontier.has(theoryId));

      lines.push(cnlLine('FRONTIER_RETAIN', { theories: currentFrontier }));

      if (dropped.length > 0) {
        lines.push(cnlLine('FRONTIER_DROP', { theories: dropped }));
      }

      if (added.length > 0) {
        lines.push(cnlLine('FRONTIER_ADD', { theories: added }));
      }
    }
  }

  const canonicalCnl = lines.join('\n');
  const canonicalLines = canonicalCnl.split('\n').filter(Boolean);
  const canonicalFamilies = [...new Set(canonicalLines.map((line) => line.split(' ')[0]))];

  return {
    canonicalCnl,
    canonicalLines,
    canonicalFamilies
  };
}

function analyzeEvidence(input, options = {}) {
  const inputRecord = prepareEvidenceInput(input);
  const runRecord = buildRunRecord(inputRecord, options);
  emitRunStartTrace(options.traceCollector, inputRecord, runRecord);
  const analysis = analyzeText(inputRecord.text, {
    observerId: runRecord.observerId,
    domains: options.domains,
    maxHypotheses: runRecord.maxHypotheses,
    frontierLimit: runRecord.frontierLimit,
    policy: options.policy,
    segmentSpans: inputRecord.segmentSpans,
    traceCollector: options.traceCollector
  });
  const serialized = serializeAnalysisToCNL({
    analysis,
    inputRecord,
    runRecord
  });
  emitCompletedTrace(options.traceCollector, inputRecord, runRecord, analysis, serialized);

  return {
    usageMode: 'canonical-cnl',
    run: runRecord,
    input: inputRecord,
    analysis,
    ...serialized
  };
}

function applyEvidenceUpdate(bundle, observedAnswer, options = {}) {
  const frontierLimit = options.frontierLimit ?? bundle.run.frontierLimit;
  const selectedQuestion = options.questionId
    ? bundle.analysis.neighborhood.questionCandidates?.find((question) => question.id === options.questionId) ?? null
    : bundle.analysis.neighborhood.recommendedQuestion;

  if (options.questionId && !selectedQuestion) {
    throw new Error(`Question "${options.questionId}" is not available on the current frontier.`);
  }

  if (
    selectedQuestion &&
    bundle.run.queryBudgetLimit !== null &&
    bundle.run.queryBudgetLimit !== undefined &&
    bundle.run.queryBudgetConsumed >= bundle.run.queryBudgetLimit
  ) {
    throw new Error(
      `Question budget exhausted for run "${bundle.run.id}": ${bundle.run.queryBudgetConsumed}/${bundle.run.queryBudgetLimit} answers already applied.`
    );
  }

  const updatedRunRecord = buildUpdatedRunRecord(bundle, options, selectedQuestion, observedAnswer);
  emitRunStartTrace(options.traceCollector, bundle.input, updatedRunRecord);

  const updatedAnalysis = options.questionId
    ? applyQuestionToAnalysis(bundle.analysis, selectedQuestion, observedAnswer, frontierLimit, options.traceCollector)
    : applyDiscriminatingAnswer(bundle.analysis, observedAnswer, frontierLimit, options.traceCollector);
  const serialized = serializeAnalysisToCNL({
    analysis: updatedAnalysis,
    inputRecord: bundle.input,
    runRecord: updatedRunRecord,
    previousAnalysis: bundle.analysis
  });
  emitCompletedTrace(options.traceCollector, bundle.input, updatedRunRecord, updatedAnalysis, serialized);

  return {
    ...bundle,
    run: updatedRunRecord,
    analysis: updatedAnalysis,
    ...serialized
  };
}

export { analyzeEvidence, applyEvidenceUpdate, prepareEvidenceInput, serializeAnalysisToCNL };
