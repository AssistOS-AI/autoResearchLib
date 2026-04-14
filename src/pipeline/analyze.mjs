import { observationalLift } from '../core/observation.mjs';
import { buildNeighborhood, summarizeNeighborhood } from '../core/neighborhood.mjs';
import { applyQuestionAnswer } from '../core/questioning.mjs';
import { induceLocalTheories } from '../core/theory.mjs';
import {
  defaultDomains,
  getDomainById,
  getObserverProfile,
  sharedCueLexicon
} from '../domains/defaultDomains.mjs';

function lexicalizeFrontier(frontier) {
  return frontier.map((theory) => {
    const domain = getDomainById(theory.domainId);

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
    frontierLimit = 8
  } = {}
) {
  const observer = getObserverProfile(observerId);
  const lifted = observationalLift(text, {
    observer,
    domains,
    sharedCueLexicon,
    maxHypotheses
  });
  const baseTheories = induceLocalTheories(lifted.hypotheses, domains);
  const neighborhood = buildNeighborhood({
    baseTheories,
    observer,
    domains,
    frontierLimit
  });

  return {
    text,
    observer,
    domains,
    hypotheses: lifted.hypotheses,
    rawCues: lifted.rawCues,
    baseTheories,
    neighborhood,
    alignments: lexicalizeFrontier(neighborhood.frontier)
  };
}

function applyDiscriminatingAnswer(analysis, observedAnswer, frontierLimit = analysis.neighborhood.frontierLimit) {
  const question = analysis.neighborhood.recommendedQuestion;

  if (!question) {
    return {
      ...analysis,
      questionUpdate: null
    };
  }

  const updated = applyQuestionAnswer(analysis.neighborhood.theories, question, observedAnswer, frontierLimit);
  const neighborhood = summarizeNeighborhood({
    theories: updated.theories,
    transformations: analysis.neighborhood.transformations,
    observer: analysis.observer,
    domains: analysis.domains,
    frontierLimit
  });

  return {
    ...analysis,
    neighborhood,
    alignments: lexicalizeFrontier(neighborhood.frontier),
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

export { analyzeText, applyDiscriminatingAnswer };
