function assessNoveltyRisk(
  analysis,
  overrides = {}
) {
  const thresholds = {
    ...(analysis.policy?.novelty ?? {}),
    ...overrides
  };
  const {
    topWeightThreshold = 0.58,
    entropyThreshold = 0.95,
    frontierWidthThreshold = 3,
    supportGapThreshold = 0.12,
    closureWeightThreshold = 0.72,
    closureEntropyThreshold = 0.45
  } = thresholds;
  const distribution = analysis.neighborhood.domainDistribution;
  const topWeight = distribution[0]?.weight ?? 0;
  const secondWeight = distribution[1]?.weight ?? 0;
  const supportValues = Object.values(
    analysis.hypotheses.find((hypothesis) => hypothesis.focusDomain === null)?.supportByDomain ?? {}
  ).sort((left, right) => right - left);
  const supportGap = (supportValues[0] ?? 0) - (supportValues[1] ?? 0);
  const signals = {
    lowTopWeight: topWeight < topWeightThreshold,
    highEntropy: analysis.neighborhood.domainEntropy > entropyThreshold,
    wideFrontier: analysis.neighborhood.frontier.length >= frontierWidthThreshold,
    narrowSupportGap: supportGap < supportGapThreshold,
    unresolvedQuestion: Boolean(analysis.neighborhood.recommendedQuestion)
  };
  const signalCount = Object.values(signals).filter(Boolean).length;

  return {
    openSetCandidate: signalCount >= 2,
    falseClosureRisk:
      topWeight >= closureWeightThreshold &&
      analysis.neighborhood.domainEntropy <= closureEntropyThreshold &&
      analysis.neighborhood.frontier.length === 1,
    uncertaintyScore: signalCount / Object.keys(signals).length,
    topWeight,
    secondWeight,
    supportGap,
    domainEntropy: analysis.neighborhood.domainEntropy,
    frontierWidth: analysis.neighborhood.frontier.length,
    signals
  };
}

export { assessNoveltyRisk };
