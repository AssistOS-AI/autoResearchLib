import { observationalLift } from '../core/observation.mjs';
import { buildNeighborhood, summarizeNeighborhood } from '../core/neighborhood.mjs';
import { applyQuestionAnswer } from '../core/questioning.mjs';
import { induceLocalTheories } from '../core/theory.mjs';
import { createAnalysisPolicy } from '../config/analysisPolicy.mjs';
import {
  defaultDomains,
  getDomainById,
  getObserverProfile,
  sharedCueLexicon
} from '../domains/defaultDomains.mjs';

function neighborhoodTraceMetrics(neighborhood) {
  return {
    domainEntropy: neighborhood.domainEntropy,
    theoryEntropy: neighborhood.theoryEntropy,
    frontierWidth: neighborhood.frontier.length,
    topDomain: neighborhood.domainDistribution[0]?.domainId ?? null,
    topTheory: neighborhood.frontier[0]?.id ?? null
  };
}

function emitObservationTrace(traceCollector, lifted, observer) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const allCues = [...lifted.rawCues.explicit, ...lifted.rawCues.inferred];
  const snapshotId = traceCollector.snapshot(
    'observation',
    {
      observer: observer.id,
      rawCues: lifted.rawCues,
      hypotheses: lifted.hypotheses
    },
    {
      summary: 'Observational lifting completed'
    }
  );

  traceCollector.emit({
    stage: 'observation',
    kind: 'observation.completed',
    summary: `Built ${lifted.hypotheses.length} hypotheses from ${allCues.length} cues`,
    objectRefs: {
      cueIds: allCues.map((cue) => cue.id),
      hypothesisIds: lifted.hypotheses.map((hypothesis) => hypothesis.id)
    },
    payload: {
      observerId: observer.id,
      explicitCueCount: lifted.rawCues.explicit.length,
      inferredCueCount: lifted.rawCues.inferred.length
    },
    snapshotId
  });

  for (const cue of lifted.rawCues.explicit) {
    traceCollector.emit({
      stage: 'observation',
      kind: 'cue.explicit.matched',
      summary: `Matched explicit cue ${cue.id}`,
      objectRefs: {
        cueIds: [cue.id],
        segmentIds: cue.sources?.map((source) => source.segmentId).filter(Boolean) ?? [],
        domainIds: cue.domainId ? [cue.domainId] : []
      },
      payload: cue,
      snapshotId
    });
  }

  for (const cue of lifted.rawCues.inferred) {
    traceCollector.emit({
      stage: 'observation',
      kind: 'cue.inferred.added',
      summary: `Added inferred cue ${cue.id}`,
      objectRefs: {
        cueIds: [cue.id],
        domainIds: cue.domainId ? [cue.domainId] : []
      },
      payload: cue,
      snapshotId
    });
  }

  for (const hypothesis of lifted.hypotheses) {
    traceCollector.emit({
      stage: 'observation',
      kind: 'hypothesis.created',
      summary: `Created hypothesis ${hypothesis.id}`,
      objectRefs: {
        hypothesisIds: [hypothesis.id],
        cueIds: [...hypothesis.explicitCues, ...hypothesis.inferredCues].map((cue) => cue.id)
      },
      payload: {
        focusDomain: hypothesis.focusDomain,
        ambiguityDomains: hypothesis.ambiguities,
        confidenceProfile: hypothesis.confidenceProfile
      },
      snapshotId
    });

    traceCollector.emit({
      stage: 'observation',
      kind: 'hypothesis.support.scored',
      summary: `Scored support for ${hypothesis.id}`,
      objectRefs: {
        hypothesisIds: [hypothesis.id],
        domainIds: Object.keys(hypothesis.supportByDomain)
      },
      payload: {
        supportByDomain: hypothesis.supportByDomain
      },
      snapshotId
    });
  }
}

function emitInductionTrace(traceCollector, baseTheories) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const snapshotId = traceCollector.snapshot(
    'induction',
    {
      baseTheories
    },
    {
      summary: 'Base theories induced'
    }
  );

  traceCollector.emit({
    stage: 'induction',
    kind: 'induction.completed',
    summary: `Induced ${baseTheories.length} base theories`,
    objectRefs: {
      theoryIds: baseTheories.map((theory) => theory.id),
      hypothesisIds: baseTheories.map((theory) => theory.hypothesisId),
      domainIds: baseTheories.map((theory) => theory.domainId)
    },
    payload: {
      theoryCount: baseTheories.length
    },
    snapshotId
  });

  for (const theory of baseTheories) {
    traceCollector.emit({
      stage: 'induction',
      kind: 'theory.base.induced',
      summary: `Induced base theory ${theory.id}`,
      objectRefs: {
        theoryIds: [theory.id],
        hypothesisIds: [theory.hypothesisId],
        cueIds: theory.matchedCues.map((cue) => cue.id),
        domainIds: [theory.domainId]
      },
      payload: {
        variant: theory.variant,
        matchedStates: theory.matchedStates,
        scoreProfile: theory.scoreProfile
      },
      snapshotId
    });
  }
}

function emitAlignmentTrace(traceCollector, analysis, alignments) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const snapshotId = traceCollector.snapshot(
    'alignment',
    {
      alignments
    },
    {
      summary: alignments.length > 0 ? 'Alignment summaries generated' : 'Alignment skipped or empty',
      metrics: neighborhoodTraceMetrics(analysis.neighborhood)
    }
  );

  traceCollector.emit({
    stage: 'alignment',
    kind: 'alignment.completed',
    summary: alignments.length > 0 ? `Generated ${alignments.length} alignment summaries` : 'No alignments generated',
    objectRefs: {
      theoryIds: alignments.map((alignment) => alignment.theoryId),
      domainIds: alignments.map((alignment) => alignment.domainId)
    },
    payload: {
      status: alignments.length > 0 ? 'generated' : 'skipped-or-empty'
    },
    metrics: neighborhoodTraceMetrics(analysis.neighborhood),
    snapshotId
  });

  for (const alignment of alignments) {
    traceCollector.emit({
      stage: 'alignment',
      kind: 'alignment.generated',
      summary: `Aligned ${alignment.theoryId} to ${alignment.domainId}`,
      objectRefs: {
        theoryIds: [alignment.theoryId],
        domainIds: [alignment.domainId]
      },
      payload: alignment,
      snapshotId
    });
  }
}

function lexicalizeFrontier(frontier, domains, policy) {
  if (policy?.features?.alignment === false) {
    return [];
  }

  return frontier.map((theory) => {
    const domain = domains.find((entry) => entry.id === theory.domainId) ?? getDomainById(theory.domainId);

    return {
      theoryId: theory.id,
      domainId: theory.domainId,
      title: domain?.label ?? theory.domainId,
      summary: domain?.lexicalSummary ?? theory.lexicalization.summary,
      retainedBecause: {
        evidenceCoverage: theory.scoreProfile.evidenceCoverage,
        predictiveAdequacy: theory.scoreProfile.predictiveAdequacy,
        stability: theory.scoreProfile.stability
      }
    };
  });
}

function analyzeText(
  text,
  {
    observerId = 'coarse',
    domains = defaultDomains,
    maxHypotheses = 4,
    frontierLimit = 8,
    policy: policyOverrides = {},
    segmentSpans = [],
    traceCollector = null
  } = {}
) {
  const observer = getObserverProfile(observerId);
  const policy = createAnalysisPolicy(policyOverrides);
  const lifted = observationalLift(text, {
    observer,
    domains,
    sharedCueLexicon,
    maxHypotheses,
    policy,
    segmentSpans
  });
  emitObservationTrace(traceCollector, lifted, observer);
  const baseTheories = induceLocalTheories(lifted.hypotheses, domains, policy);
  emitInductionTrace(traceCollector, baseTheories);
  const neighborhood = buildNeighborhood({
    baseTheories,
    observer,
    domains,
    frontierLimit,
    policy,
    traceCollector
  });
  const alignments = lexicalizeFrontier(neighborhood.frontier, domains, policy);
  const analysis = {
    text,
    observer,
    domains,
    policy,
    hypotheses: lifted.hypotheses,
    rawCues: lifted.rawCues,
    baseTheories,
    neighborhood,
    alignments
  };
  emitAlignmentTrace(traceCollector, analysis, alignments);

  return analysis;
}

function applyQuestionToAnalysis(
  analysis,
  question,
  observedAnswer,
  frontierLimit = analysis.neighborhood.frontierLimit,
  traceCollector = null
) {
  if (!question) {
    return {
      ...analysis,
      questionUpdate: null
    };
  }

  const questionSnapshotId = traceCollector?.snapshot?.(
    'questioning',
    {
      question,
      observedAnswer,
      before: {
        frontierIds: analysis.neighborhood.frontier.map((theory) => theory.id),
        domainDistribution: analysis.neighborhood.domainDistribution,
        theoryDistribution: analysis.neighborhood.theoryDistribution
      }
    },
    {
      summary: `Applying answer ${observedAnswer} to ${question.id}`,
      metrics: neighborhoodTraceMetrics(analysis.neighborhood)
    }
  );

  traceCollector?.emit?.({
    stage: 'questioning',
    kind: 'question.answered',
    importance: 'high',
    summary: `Answered ${question.id} with "${observedAnswer}"`,
    objectRefs: {
      questionIds: [question.id],
      domainIds: Object.keys(question.answerMap ?? {})
    },
    payload: {
      prompt: question.prompt,
      observedAnswer,
      informationGain: question.informationGain
    },
    metrics: neighborhoodTraceMetrics(analysis.neighborhood),
    snapshotId: questionSnapshotId
  });

  const updated = applyQuestionAnswer(
    analysis.neighborhood.theories,
    question,
    observedAnswer,
    frontierLimit,
    analysis.policy
  );
  const neighborhood = summarizeNeighborhood({
    theories: updated.theories,
    transformations: analysis.neighborhood.transformations,
    observer: analysis.observer,
    domains: analysis.domains,
    frontierLimit,
    policy: analysis.policy,
    traceCollector,
    previousNeighborhood: analysis.neighborhood
  });
  const alignments = lexicalizeFrontier(neighborhood.frontier, analysis.domains, analysis.policy);
  const updatedAnalysis = {
    ...analysis,
    neighborhood,
    alignments,
    questionUpdate: {
      questionId: question.id,
      prompt: question.prompt,
      observedAnswer,
      domainEntropyBefore: analysis.neighborhood.domainEntropy,
      domainEntropyAfter: neighborhood.domainEntropy,
      theoryEntropyBefore: analysis.neighborhood.theoryEntropy,
      theoryEntropyAfter: neighborhood.theoryEntropy
    }
  };

  const updateSnapshotId = traceCollector?.snapshot?.(
    'questioning',
    {
      question,
      observedAnswer,
      after: {
        frontierIds: neighborhood.frontier.map((theory) => theory.id),
        domainDistribution: neighborhood.domainDistribution,
        theoryDistribution: neighborhood.theoryDistribution
      },
      update: updatedAnalysis.questionUpdate
    },
    {
      summary: `Applied update for ${question.id}`,
      metrics: neighborhoodTraceMetrics(neighborhood)
    }
  );

  traceCollector?.emit?.({
    stage: 'questioning',
    kind: 'update.applied',
    importance: 'high',
    summary: `Updated frontier after ${question.id}`,
    objectRefs: {
      questionIds: [question.id],
      theoryIds: neighborhood.frontier.map((theory) => theory.id),
      domainIds: neighborhood.domainDistribution.map((entry) => entry.domainId)
    },
    payload: updatedAnalysis.questionUpdate,
    metrics: neighborhoodTraceMetrics(neighborhood),
    snapshotId: updateSnapshotId
  });
  emitAlignmentTrace(traceCollector, updatedAnalysis, alignments);

  return updatedAnalysis;
}

function applyDiscriminatingAnswer(
  analysis,
  observedAnswer,
  frontierLimit = analysis.neighborhood.frontierLimit,
  traceCollector = null
) {
  return applyQuestionToAnalysis(
    analysis,
    analysis.neighborhood.recommendedQuestion,
    observedAnswer,
    frontierLimit,
    traceCollector
  );
}

export { analyzeText, applyDiscriminatingAnswer, applyQuestionToAnalysis };
