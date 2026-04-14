import { clamp, withComputedTotal } from './frontier.mjs';

function cueSetForDomain(hypothesis, domainId) {
  return [...hypothesis.explicitCues, ...hypothesis.inferredCues].filter(
    (cue) => cue.domainId === null || cue.domainId === domainId
  );
}

function sumCueWeights(cues, predicate) {
  return cues.filter(predicate).reduce((sum, cue) => sum + cue.weight, 0);
}

function computeSequenceCoverage(domain, matchedCueIds) {
  let prefixLength = 0;

  for (const state of domain.stateSequence) {
    const anchors = domain.stateAnchors[state] ?? [];
    const hasStateEvidence = anchors.some((cueId) => matchedCueIds.has(cueId));

    if (!hasStateEvidence) {
      break;
    }

    prefixLength += 1;
  }

  return domain.stateSequence.length === 0 ? 0 : prefixLength / domain.stateSequence.length;
}

function selectHypothesisForDomain(hypotheses, domainId) {
  const focused = hypotheses.filter((hypothesis) => hypothesis.focusDomain === domainId);
  const candidates = focused.length > 0 ? focused : hypotheses;

  return [...candidates].sort(
    (left, right) => (right.supportByDomain[domainId] ?? 0) - (left.supportByDomain[domainId] ?? 0)
  )[0];
}

function buildScoreProfile({
  hypothesis,
  domain,
  domainSupport,
  totalSupport,
  genericSignal,
  domainSignal,
  inferenceSignal,
  sequenceCoverage
}) {
  const genericNorm = clamp(genericSignal / 0.82);
  const domainNorm = clamp(domainSignal / domain.maxDomainSignal);
  const inferenceNorm = clamp(inferenceSignal / Math.max(domain.maxInferredSignal, 0.16));
  const supportShare = totalSupport > 0 ? domainSupport / totalSupport : 1 / 3;
  const ambiguityPenalty = 1 - supportShare;
  const focusBonus = hypothesis.focusDomain === domain.id ? 1 : 0.35;

  return withComputedTotal({
    evidenceCoverage: clamp(genericNorm * 0.3 + domainNorm * 0.7),
    predictiveAdequacy: clamp(sequenceCoverage * 0.45 + domainNorm * 0.35 + inferenceNorm * 0.2),
    compressionUtility: clamp(0.5 + genericNorm * 0.15 + supportShare * 0.2 + sequenceCoverage * 0.15 - (1 - sequenceCoverage) * 0.05),
    compositionalSharpness: clamp(sequenceCoverage * 0.45 + domainNorm * 0.3 + focusBonus * 0.15 + supportShare * 0.1),
    stability: clamp(0.45 + genericNorm * 0.2 + sequenceCoverage * 0.15 + supportShare * 0.15 - ambiguityPenalty * 0.1),
    alignmentUtility: clamp(domainNorm * 0.45 + focusBonus * 0.2 + inferenceNorm * 0.2 + supportShare * 0.15)
  });
}

function buildTheoryCandidate(hypothesis, domain) {
  const matchedCues = cueSetForDomain(hypothesis, domain.id);
  const matchedCueIds = new Set(matchedCues.map((cue) => cue.id));
  const genericSignal = sumCueWeights(matchedCues, (cue) => cue.domainId === null);
  const domainSignal = sumCueWeights(
    matchedCues,
    (cue) => cue.domainId === domain.id && cue.evidenceType === 'explicit'
  );
  const inferenceSignal = sumCueWeights(
    matchedCues,
    (cue) => cue.domainId === domain.id && cue.evidenceType === 'inferred'
  );
  const totalSupport = Object.values(hypothesis.supportByDomain).reduce((sum, value) => sum + value, 0);
  const domainSupport = hypothesis.supportByDomain[domain.id] ?? 0;
  const sequenceCoverage = computeSequenceCoverage(domain, matchedCueIds);

  return {
    id: `${hypothesis.id}:${domain.id}:base`,
    domainId: domain.id,
    domainLabel: domain.label,
    hypothesisId: hypothesis.id,
    variant: 'base',
    stateSchema: domain.stateSchema,
    invariants: domain.invariants,
    rewriteTemplates: domain.rewriteTemplates,
    compositionRules: domain.compositionRules,
    matchedCues,
    matchedStates: domain.stateSequence.filter((state) =>
      (domain.stateAnchors[state] ?? []).some((cueId) => matchedCueIds.has(cueId))
    ),
    predictedAnswers: Object.fromEntries(
      domain.questions.map((question) => [question.id, question.answerMap[domain.id] ?? 'unknown'])
    ),
    lexicalization: {
      title: domain.label,
      summary: domain.lexicalSummary
    },
    scoreProfile: buildScoreProfile({
      hypothesis,
      domain,
      domainSupport,
      totalSupport,
      genericSignal,
      domainSignal,
      inferenceSignal,
      sequenceCoverage
    })
  };
}

function adjustScoreProfile(scoreProfile, deltas) {
  return withComputedTotal({
    evidenceCoverage: clamp(scoreProfile.evidenceCoverage + (deltas.evidenceCoverage ?? 0)),
    predictiveAdequacy: clamp(scoreProfile.predictiveAdequacy + (deltas.predictiveAdequacy ?? 0)),
    compressionUtility: clamp(scoreProfile.compressionUtility + (deltas.compressionUtility ?? 0)),
    compositionalSharpness: clamp(scoreProfile.compositionalSharpness + (deltas.compositionalSharpness ?? 0)),
    stability: clamp(scoreProfile.stability + (deltas.stability ?? 0)),
    alignmentUtility: clamp(scoreProfile.alignmentUtility + (deltas.alignmentUtility ?? 0))
  });
}

function buildVariant(baseTheory, variant, deltas, additions = {}) {
  return {
    ...baseTheory,
    ...additions,
    id: `${baseTheory.hypothesisId}:${baseTheory.domainId}:${variant}`,
    variant,
    scoreProfile: adjustScoreProfile(baseTheory.scoreProfile, deltas)
  };
}

function expandTheoryFamily(baseTheory) {
  const refined = buildVariant(
    baseTheory,
    'refined',
    {
      predictiveAdequacy: 0.05,
      compressionUtility: -0.06,
      compositionalSharpness: 0.07,
      alignmentUtility: 0.03
    },
    {
      invariants: [...baseTheory.invariants, `${baseTheory.domainLabel} keeps a finer-grained state boundary`]
    }
  );
  const coarsened = buildVariant(
    baseTheory,
    'coarsened',
    {
      predictiveAdequacy: -0.03,
      compressionUtility: 0.05,
      compositionalSharpness: -0.06,
      stability: 0.04
    },
    {
      compositionRules: [...baseTheory.compositionRules, 'coarsened composition merges adjacent local states']
    }
  );
  const refactorized = buildVariant(
    baseTheory,
    'refactorized',
    {
      evidenceCoverage: 0.01,
      predictiveAdequacy: 0.02,
      compressionUtility: -0.02,
      compositionalSharpness: 0.04,
      alignmentUtility: 0.05
    },
    {
      rewriteTemplates: [...baseTheory.rewriteTemplates, 'refactorize equivalent local rewrite blocks']
    }
  );

  return {
    theories: [baseTheory, refined, coarsened, refactorized],
    transformations: [
      {
        from: baseTheory.id,
        to: refined.id,
        type: 'refinement'
      },
      {
        from: baseTheory.id,
        to: coarsened.id,
        type: 'coarsening'
      },
      {
        from: baseTheory.id,
        to: refactorized.id,
        type: 'refactorization'
      }
    ]
  };
}

function induceLocalTheories(hypotheses, domains) {
  return domains.map((domain) => buildTheoryCandidate(selectHypothesisForDomain(hypotheses, domain.id), domain));
}

export { expandTheoryFamily, induceLocalTheories };
