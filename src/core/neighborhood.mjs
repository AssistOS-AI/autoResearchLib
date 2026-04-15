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
  const rescueTolerance = policy?.frontier?.rescueTolerance ?? 0.08;

  if (policy?.features?.domainRescue === false) {
    const strictFrontierIds = new Set(strictFrontier.map((theory) => theory.id));

    return {
      frontier: strictFrontier,
      strictFrontier,
      rescuedIds: [],
      droppedIds: theories.filter((theory) => !strictFrontierIds.has(theory.id)).map((theory) => theory.id),
      rescueTolerance
    };
  }

  const rescued = new Map(strictFrontier.map((theory) => [theory.id, theory]));
  const distinctDomains = [...new Set(theories.map((theory) => theory.domainId))];
  const bestTotal = strictFrontier[0]?.scoreProfile.total ?? 0;
  const strictFrontierIds = new Set(strictFrontier.map((theory) => theory.id));

  for (const domainId of distinctDomains) {
    if (strictFrontier.some((theory) => theory.domainId === domainId)) {
      continue;
    }

    const bestForDomain = sortByScore(theories.filter((theory) => theory.domainId === domainId))[0];

    if (!bestForDomain) {
      continue;
    }

    if (bestTotal - bestForDomain.scoreProfile.total <= rescueTolerance) {
      rescued.set(bestForDomain.id, bestForDomain);
    }
  }

  const frontier = sortByScore([...rescued.values()]).slice(0, frontierLimit);
  const frontierIds = new Set(frontier.map((theory) => theory.id));

  return {
    frontier,
    strictFrontier,
    rescuedIds: frontier.filter((theory) => !strictFrontierIds.has(theory.id)).map((theory) => theory.id),
    droppedIds: theories.filter((theory) => !frontierIds.has(theory.id)).map((theory) => theory.id),
    rescueTolerance
  };
}

function neighborhoodTraceMetrics(frontier, theoryDistribution, domainDistribution) {
  return {
    domainEntropy: computeEntropy(domainDistribution.map((entry) => entry.weight)),
    theoryEntropy: computeEntropy(theoryDistribution.map((entry) => entry.weight)),
    frontierWidth: frontier.length,
    topDomain: domainDistribution[0]?.domainId ?? null,
    topTheory: frontier[0]?.id ?? null
  };
}

function emitNeighborhoodExpansionTrace(traceCollector, theories, transformations) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const snapshotId = traceCollector.snapshot(
    'neighborhood',
    {
      theories,
      transformations
    },
    {
      summary: 'Neighborhood variants expanded'
    }
  );

  traceCollector.emit({
    stage: 'neighborhood',
    kind: 'neighborhood.expanded',
    summary: `Expanded to ${theories.length} theories and ${transformations.length} transforms`,
    objectRefs: {
      theoryIds: theories.map((theory) => theory.id)
    },
    payload: {
      transformationCount: transformations.length
    },
    snapshotId
  });

  for (const theory of theories.filter((entry) => entry.variant !== 'base')) {
    traceCollector.emit({
      stage: 'neighborhood',
      kind: 'theory.variant.expanded',
      summary: `Expanded ${theory.id}`,
      objectRefs: {
        theoryIds: [theory.id],
        domainIds: [theory.domainId]
      },
      payload: {
        variant: theory.variant,
        hypothesisId: theory.hypothesisId
      },
      snapshotId
    });
  }

  for (const transformation of transformations) {
    traceCollector.emit({
      stage: 'neighborhood',
      kind: 'transform.created',
      summary: `${transformation.type} ${transformation.from} -> ${transformation.to}`,
      objectRefs: {
        theoryIds: [transformation.from, transformation.to]
      },
      payload: transformation,
      snapshotId
    });
  }
}

function emitNeighborhoodSummaryTrace(
  traceCollector,
  {
    theories,
    frontierSelection,
    frontier,
    theoryDistribution,
    domainDistribution,
    equivalenceClasses,
    robustInvariants,
    theorySensitiveConsequences,
    questionCandidates,
    recommendedQuestion
  }
) {
  if (!traceCollector?.emit || !traceCollector?.snapshot) {
    return;
  }

  const metrics = neighborhoodTraceMetrics(frontier, theoryDistribution, domainDistribution);
  const frontierSnapshotId = traceCollector.snapshot(
    'frontier',
    {
      frontier,
      strictFrontier: frontierSelection.strictFrontier,
      frontierSelection,
      theoryDistribution,
      domainDistribution
    },
    {
      summary: 'Frontier computed',
      metrics
    }
  );

  traceCollector.emit({
    stage: 'frontier',
    kind: 'frontier.updated',
    summary: `Computed frontier of width ${frontier.length}`,
    objectRefs: {
      theoryIds: frontier.map((theory) => theory.id),
      domainIds: domainDistribution.map((entry) => entry.domainId)
    },
    payload: {
      strictFrontierIds: frontierSelection.strictFrontier.map((theory) => theory.id),
      rescuedIds: frontierSelection.rescuedIds,
      droppedIds: frontierSelection.droppedIds,
      rescueTolerance: frontierSelection.rescueTolerance
    },
    metrics,
    snapshotId: frontierSnapshotId
  });

  const rescuedIds = new Set(frontierSelection.rescuedIds);

  for (const theory of frontier) {
    traceCollector.emit({
      stage: 'frontier',
      kind: rescuedIds.has(theory.id) ? 'frontier.member.rescued' : 'frontier.member.retained',
      summary: `${rescuedIds.has(theory.id) ? 'Rescued' : 'Retained'} ${theory.id}`,
      objectRefs: {
        theoryIds: [theory.id],
        domainIds: [theory.domainId]
      },
      payload: {
        variant: theory.variant,
        scoreProfile: theory.scoreProfile
      },
      snapshotId: frontierSnapshotId
    });
  }

  for (const droppedId of frontierSelection.droppedIds) {
    const droppedTheory = theories.find((theory) => theory.id === droppedId);

    traceCollector.emit({
      stage: 'frontier',
      kind: 'frontier.member.dropped',
      summary: `Dropped ${droppedId}`,
      objectRefs: {
        theoryIds: [droppedId],
        domainIds: droppedTheory?.domainId ? [droppedTheory.domainId] : []
      },
      payload: droppedTheory
        ? {
            variant: droppedTheory.variant,
            scoreProfile: droppedTheory.scoreProfile
          }
        : {},
      snapshotId: frontierSnapshotId
    });
  }

  const equivalenceSnapshotId = traceCollector.snapshot(
    'equivalence',
    {
      equivalenceClasses,
      robustInvariants,
      theorySensitiveConsequences
    },
    {
      summary: 'Equivalence classes and consequences derived',
      metrics
    }
  );

  for (const equivalenceClass of equivalenceClasses) {
    traceCollector.emit({
      stage: 'equivalence',
      kind: 'equivalence.class.built',
      summary: `Built ${equivalenceClass.id}`,
      objectRefs: {
        equivalenceIds: [equivalenceClass.id],
        theoryIds: equivalenceClass.theoryIds,
        domainIds: equivalenceClass.domains
      },
      payload: equivalenceClass,
      snapshotId: equivalenceSnapshotId
    });
  }

  traceCollector.emit({
    stage: 'equivalence',
    kind: 'consequence.derived',
    summary: `Derived ${robustInvariants.length} robust invariants`,
    objectRefs: {
      theoryIds: frontier.map((theory) => theory.id),
      domainIds: frontier.map((theory) => theory.domainId)
    },
    payload: {
      robustInvariants,
      theorySensitiveConsequences
    },
    snapshotId: equivalenceSnapshotId
  });

  const questioningSnapshotId = traceCollector.snapshot(
    'questioning',
    {
      questionCandidates,
      recommendedQuestion
    },
    {
      summary: questionCandidates.length > 0 ? 'Questions scored over retained domains' : 'No discriminating question available',
      metrics
    }
  );

  for (const question of questionCandidates) {
    traceCollector.emit({
      stage: 'questioning',
      kind: 'question.scored',
      summary: `Scored ${question.id}`,
      objectRefs: {
        questionIds: [question.id],
        domainIds: Object.keys(question.predictedAnswersByDomain ?? {})
      },
      payload: {
        informationGain: question.informationGain,
        priorEntropy: question.priorEntropy,
        expectedEntropy: question.expectedEntropy,
        answerClasses: question.answerClasses,
        answerPartitions: question.answerPartitions
      },
      snapshotId: questioningSnapshotId
    });
  }

  if (recommendedQuestion) {
    traceCollector.emit({
      stage: 'questioning',
      kind: 'question.selected',
      summary: `Selected ${recommendedQuestion.id}`,
      objectRefs: {
        questionIds: [recommendedQuestion.id],
        domainIds: Object.keys(recommendedQuestion.predictedAnswersByDomain ?? {})
      },
      payload: {
        informationGain: recommendedQuestion.informationGain
      },
      snapshotId: questioningSnapshotId
    });
  }
}

function summarizeNeighborhood({
  theories,
  transformations,
  observer,
  domains,
  frontierLimit = 8,
  policy,
  traceCollector = null
}) {
  const frontierSelection = retainFrontierWithAlternatives(theories, frontierLimit, policy);
  const frontier = frontierSelection.frontier;
  const theoryDistribution = computeTheoryDistribution(frontier);
  const domainDistribution = computeDomainDistribution(frontier);
  const { robustInvariants, theorySensitiveConsequences } = summarizeConsequences(frontier);
  const questionCandidates = scoreDiscriminatingQuestions(frontier, domains, policy).filter(
    (question) => question.informationGain > 0.0001
  );
  const neighborhood = {
    theories,
    frontier,
    strictFrontier: frontierSelection.strictFrontier,
    frontierSelection,
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

  emitNeighborhoodSummaryTrace(traceCollector, neighborhood);

  return neighborhood;
}

function buildNeighborhood({ baseTheories, observer, domains, frontierLimit = 8, policy, traceCollector = null }) {
  const expansions = baseTheories.map((theory) => expandTheoryFamily(theory, policy));
  const theories = expansions.flatMap((entry) => entry.theories);
  const transformations = expansions.flatMap((entry) => entry.transformations);
  emitNeighborhoodExpansionTrace(traceCollector, theories, transformations);

  return summarizeNeighborhood({
    theories,
    transformations,
    observer,
    domains,
    frontierLimit,
    policy,
    traceCollector
  });
}

export { buildNeighborhood, summarizeNeighborhood };
