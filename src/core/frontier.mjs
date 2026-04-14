const SCORE_DIMENSIONS = [
  'evidenceCoverage',
  'predictiveAdequacy',
  'compressionUtility',
  'compositionalSharpness',
  'stability',
  'alignmentUtility'
];

const SCORE_WEIGHTS = {
  evidenceCoverage: 0.22,
  predictiveAdequacy: 0.28,
  compressionUtility: 0.1,
  compositionalSharpness: 0.16,
  stability: 0.14,
  alignmentUtility: 0.1
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function computeScoreTotal(scoreProfile) {
  const total = SCORE_DIMENSIONS.reduce(
    (sum, dimension) => sum + (scoreProfile[dimension] ?? 0) * SCORE_WEIGHTS[dimension],
    0
  );

  return clamp(total);
}

function withComputedTotal(scoreProfile) {
  return {
    ...scoreProfile,
    total: computeScoreTotal(scoreProfile)
  };
}

function dominates(candidate, other) {
  let strictlyBetter = false;

  for (const dimension of SCORE_DIMENSIONS) {
    const candidateValue = candidate.scoreProfile[dimension] ?? 0;
    const otherValue = other.scoreProfile[dimension] ?? 0;

    if (candidateValue < otherValue) {
      return false;
    }

    if (candidateValue > otherValue) {
      strictlyBetter = true;
    }
  }

  return strictlyBetter;
}

function sortByScore(theories) {
  return [...theories].sort((left, right) => {
    const totalDelta = (right.scoreProfile.total ?? 0) - (left.scoreProfile.total ?? 0);

    if (totalDelta !== 0) {
      return totalDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

function retainNonDominated(theories, limit = 8) {
  const retained = theories.filter((theory) => !theories.some((other) => other.id !== theory.id && dominates(other, theory)));

  return sortByScore(retained).slice(0, limit);
}

function normalizeWeights(items, accessor) {
  const rawWeights = items.map((item) => Math.max(0.0001, accessor(item)));
  const total = rawWeights.reduce((sum, value) => sum + value, 0);

  return items.map((item, index) => ({
    item,
    weight: rawWeights[index] / total
  }));
}

function computeEntropy(weights) {
  return weights.reduce((sum, value) => {
    if (value <= 0) {
      return sum;
    }

    return sum - value * Math.log2(value);
  }, 0);
}

function computeTheoryDistribution(theories) {
  return normalizeWeights(theories, (theory) => theory.scoreProfile.total ?? 0).map(({ item, weight }) => ({
    id: item.id,
    domainId: item.domainId,
    variant: item.variant,
    weight
  }));
}

function computeDomainDistribution(theories) {
  const grouped = new Map();

  for (const { item, weight } of normalizeWeights(theories, (theory) => theory.scoreProfile.total ?? 0)) {
    grouped.set(item.domainId, (grouped.get(item.domainId) ?? 0) + weight);
  }

  return [...grouped.entries()]
    .map(([domainId, weight]) => ({ domainId, weight }))
    .sort((left, right) => right.weight - left.weight);
}

export {
  SCORE_DIMENSIONS,
  clamp,
  computeDomainDistribution,
  computeEntropy,
  computeScoreTotal,
  computeTheoryDistribution,
  normalizeWeights,
  retainNonDominated,
  sortByScore,
  withComputedTotal
};
