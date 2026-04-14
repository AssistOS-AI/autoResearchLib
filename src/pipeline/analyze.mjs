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
    segmentSpans = []
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
  const baseTheories = induceLocalTheories(lifted.hypotheses, domains, policy);
  const neighborhood = buildNeighborhood({
    baseTheories,
    observer,
    domains,
    frontierLimit,
    policy
  });

  return {
    text,
    observer,
    domains,
    policy,
    hypotheses: lifted.hypotheses,
    rawCues: lifted.rawCues,
    baseTheories,
    neighborhood,
    alignments: lexicalizeFrontier(neighborhood.frontier, domains, policy)
  };
}

function applyQuestionToAnalysis(
  analysis,
  question,
  observedAnswer,
  frontierLimit = analysis.neighborhood.frontierLimit
) {
  if (!question) {
    return {
      ...analysis,
      questionUpdate: null
    };
  }

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
    policy: analysis.policy
  });

  return {
    ...analysis,
    neighborhood,
    alignments: lexicalizeFrontier(neighborhood.frontier, analysis.domains, analysis.policy),
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
}

function applyDiscriminatingAnswer(analysis, observedAnswer, frontierLimit = analysis.neighborhood.frontierLimit) {
  return applyQuestionToAnalysis(
    analysis,
    analysis.neighborhood.recommendedQuestion,
    observedAnswer,
    frontierLimit
  );
}

export { analyzeText, applyDiscriminatingAnswer, applyQuestionToAnalysis };
