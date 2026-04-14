function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text) {
  return String(text).toLowerCase();
}

function tokenizeText(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function topDistributionDomain(distribution) {
  return distribution.sort((left, right) => right.weight - left.weight || left.domainId.localeCompare(right.domainId))[0] ?? null;
}

function predictCueVote(text, domains) {
  const normalized = normalizeText(text);
  const scored = domains.map((domain) => {
    const weight = domain.cueLexicon.reduce((sum, cue) => {
      const matches = cue.phrases.some((phrase) =>
        new RegExp(`\\b${escapePattern(phrase.toLowerCase())}\\b`, 'i').test(normalized)
      );
      return matches ? sum + cue.weight : sum;
    }, 0);

    return {
      domainId: domain.id,
      weight
    };
  });
  const total = scored.reduce((sum, entry) => sum + entry.weight, 0);
  const distribution = scored.map((entry) => ({
    ...entry,
    weight: total > 0 ? entry.weight / total : 1 / Math.max(1, domains.length)
  }));
  const top = topDistributionDomain(distribution);

  return {
    predictedDomain: top?.domainId ?? null,
    confidence: top?.weight ?? 0,
    distribution
  };
}

function trainNaiveBayesClassifier(cases, domains) {
  const vocabulary = new Set();
  const domainStats = new Map(
    domains.map((domain) => [
      domain.id,
      {
        documentCount: 0,
        tokenCount: 0,
        tokenFrequency: new Map()
      }
    ])
  );

  for (const caseRecord of cases) {
    const stats = domainStats.get(caseRecord.groundTruthDomain);

    if (!stats) {
      continue;
    }

    stats.documentCount += 1;

    for (const token of tokenizeText(caseRecord.segments.join(' '))) {
      vocabulary.add(token);
      stats.tokenCount += 1;
      stats.tokenFrequency.set(token, (stats.tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  return {
    domains: domains.map((domain) => domain.id),
    vocabularySize: vocabulary.size,
    domainStats
  };
}

function predictNaiveBayes(model, text) {
  const tokens = tokenizeText(text);
  const totalDocuments = [...model.domainStats.values()].reduce((sum, stats) => sum + stats.documentCount, 0);
  const scored = model.domains.map((domainId) => {
    const stats = model.domainStats.get(domainId);
    const prior = Math.log((stats.documentCount + 1) / (totalDocuments + model.domains.length));
    const logLikelihood = tokens.reduce((sum, token) => {
      const tokenFrequency = stats.tokenFrequency.get(token) ?? 0;
      return sum + Math.log((tokenFrequency + 1) / (stats.tokenCount + model.vocabularySize));
    }, 0);

    return {
      domainId,
      logScore: prior + logLikelihood
    };
  });
  const maxLogScore = Math.max(...scored.map((entry) => entry.logScore));
  const expScores = scored.map((entry) => ({
    domainId: entry.domainId,
    weight: Math.exp(entry.logScore - maxLogScore)
  }));
  const total = expScores.reduce((sum, entry) => sum + entry.weight, 0);
  const distribution = expScores.map((entry) => ({
    ...entry,
    weight: total > 0 ? entry.weight / total : 1 / Math.max(1, expScores.length)
  }));
  const top = topDistributionDomain(distribution);

  return {
    predictedDomain: top?.domainId ?? null,
    confidence: top?.weight ?? 0,
    distribution
  };
}

export { predictCueVote, predictNaiveBayes, topDistributionDomain, trainNaiveBayesClassifier };
