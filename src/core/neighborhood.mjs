import {
  computeDomainDistribution,
  computeEntropy,
  computeTheoryDistribution,
  retainNonDominated,
  sortByScore
} from './frontier.mjs';
import { scoreDiscriminatingQuestions } from './questioning.mjs';
import { expandTheoryFamily } from './theory.mjs';

function buildVisibleSignature(theory, observer) {
  const visibleCueIds = theory.matchedCues
    .filter((cue) => cue.domainId === null || cue.visibleTo?.includes(observer.id))
    .map((cue) => `${cue.domainId ?? 'shared'}:${cue.id}`)
    .sort();
  const visibleStates = observer.id === 'rich' ? theory.matchedStates : theory.matchedStates.slice(0, 2);

  return `${visibleCueIds.join('|')}::${visibleStates.join('>')}`;
}

function buildEquivalenceClasses(frontier, observer, enabled = true) {
  if (!enabled) {
    return frontier.map((theory, index) => ({
      id: `eq-${index + 1}`,
      signature: theory.id,
      theoryIds: [theory.id],
      domains: [theory.domainId]
    }));
  }

  const classes = new Map();

  for (const theory of frontier) {
    const signature = buildVisibleSignature(theory, observer);
    const existing = classes.get(signature) ?? {
      id: `eq-${classes.size + 1}`,
      signature,
      theoryIds: [],
      domains: []
    };

    existing.theoryIds.push(theory.id);
    existing.domains = [...new Set([...existing.domains, theory.domainId])];
    classes.set(signature, existing);
  }

  return [...classes.values()];
}

function intersectStrings(groups) {
  if (groups.length === 0) {
    return [];
  }

  return groups[0].filter((value) => groups.every((group) => group.includes(value)));
}

function summarizeConsequences(frontier) {
  const invariants = frontier.map((theory) => theory.invariants);
  const robustInvariants = intersectStrings(invariants);

  return {
    robustInvariants,
    theorySensitiveConsequences: frontier.map((theory) => ({
      theoryId: theory.id,
      domainId: theory.domainId,
      consequences: theory.invariants.filter((invariant) => !robustInvariants.includes(invariant))
    }))
  };
}

function retainFrontierWithAlternatives(theories, frontierLimit, policy) {
  const strictFrontier = retainNonDominated(theories, frontierLimit);

  if (policy?.features?.domainRescue === false) {
    return strictFrontier;
  }

  const rescued = new Map(strictFrontier.map((theory) => [theory.id, theory]));
  const distinctDomains = [...new Set(theories.map((theory) => theory.domainId))];
  const bestTotal = strictFrontier[0]?.scoreProfile.total ?? 0;
  const tolerance = policy?.frontier?.rescueTolerance ?? 0.08;

  for (const domainId of distinctDomains) {
    if (strictFrontier.some((theory) => theory.domainId === domainId)) {
      continue;
    }

    const bestForDomain = sortByScore(theories.filter((theory) => theory.domainId === domainId))[0];

    if (!bestForDomain) {
      continue;
    }

    if (bestTotal - bestForDomain.scoreProfile.total <= tolerance) {
      rescued.set(bestForDomain.id, bestForDomain);
    }
  }

  return sortByScore([...rescued.values()]).slice(0, frontierLimit);
}

function summarizeNeighborhood({ theories, transformations, observer, domains, frontierLimit = 8, policy }) {
  const frontier = retainFrontierWithAlternatives(theories, frontierLimit, policy);
  const theoryDistribution = computeTheoryDistribution(frontier);
  const domainDistribution = computeDomainDistribution(frontier);
  const { robustInvariants, theorySensitiveConsequences } = summarizeConsequences(frontier);
  const questionCandidates = scoreDiscriminatingQuestions(frontier, domains, policy).filter(
    (question) => question.informationGain > 0.0001
  );

  return {
    theories,
    frontier,
    frontierLimit,
    transformations,
    equivalenceClasses: buildEquivalenceClasses(frontier, observer, policy?.features?.equivalenceClasses !== false),
    robustInvariants,
    theorySensitiveConsequences,
    theoryEntropy: computeEntropy(theoryDistribution.map((entry) => entry.weight)),
    domainEntropy: computeEntropy(domainDistribution.map((entry) => entry.weight)),
    theoryDistribution,
    domainDistribution,
    questionCandidates,
    recommendedQuestion: questionCandidates[0] ?? null
  };
}

function buildNeighborhood({ baseTheories, observer, domains, frontierLimit = 8, policy }) {
  const expansions = baseTheories.map((theory) => expandTheoryFamily(theory, policy));
  const theories = expansions.flatMap((entry) => entry.theories);
  const transformations = expansions.flatMap((entry) => entry.transformations);

  return summarizeNeighborhood({
    theories,
    transformations,
    observer,
    domains,
    frontierLimit,
    policy
  });
}

export { buildNeighborhood, summarizeNeighborhood };
