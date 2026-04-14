const DEFAULT_SCORE_WEIGHTS = Object.freeze({
  evidenceCoverage: 0.22,
  predictiveAdequacy: 0.28,
  compressionUtility: 0.1,
  compositionalSharpness: 0.16,
  stability: 0.14,
  alignmentUtility: 0.1
});

const DEFAULT_ANALYSIS_POLICY = Object.freeze({
  supportWeights: {
    generic: 0.3,
    explicit: 1,
    inferred: 0.7
  },
  hypothesisSelection: {
    focusRatio: 0.6,
    ambiguityRatio: 0.75
  },
  frontier: {
    rescueTolerance: 0.08
  },
  novelty: {
    topWeightThreshold: 0.58,
    entropyThreshold: 0.95,
    frontierWidthThreshold: 3,
    supportGapThreshold: 0.12,
    closureWeightThreshold: 0.72,
    closureEntropyThreshold: 0.45
  },
  features: {
    inferredCues: true,
    equivalenceClasses: true,
    domainRescue: true,
    questions: true,
    alignment: true
  },
  scoreWeights: DEFAULT_SCORE_WEIGHTS
});

function clone(value) {
  if (Array.isArray(value)) {
    return value.map(clone);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }

  return value;
}

function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return clone(overrides ?? base);
  }

  const result = clone(base);

  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object') {
      result[key] = deepMerge(result[key], value);
      continue;
    }

    result[key] = clone(value);
  }

  return result;
}

function normalizeScoreWeights(weights = DEFAULT_SCORE_WEIGHTS) {
  const positiveEntries = Object.entries(DEFAULT_SCORE_WEIGHTS).map(([dimension]) => [
    dimension,
    Math.max(0, weights[dimension] ?? 0)
  ]);
  const total = positiveEntries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= 0) {
    return clone(DEFAULT_SCORE_WEIGHTS);
  }

  return Object.fromEntries(positiveEntries.map(([dimension, value]) => [dimension, value / total]));
}

function createAnalysisPolicy(overrides = {}) {
  const policy = deepMerge(DEFAULT_ANALYSIS_POLICY, overrides);

  if (policy.features?.alignment === false) {
    policy.scoreWeights = {
      ...policy.scoreWeights,
      alignmentUtility: 0
    };
  }

  policy.scoreWeights = normalizeScoreWeights(policy.scoreWeights);
  return policy;
}

export { DEFAULT_ANALYSIS_POLICY, DEFAULT_SCORE_WEIGHTS, createAnalysisPolicy };
