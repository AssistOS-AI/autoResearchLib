import { clamp } from './frontier.mjs';
import { normalizeText, phraseMatches, tokenize, uniqueValues } from './text.mjs';

function addCue(targetMap, cue, matchPhrase, domainId, evidenceType = 'explicit') {
  const key = `${domainId ?? 'shared'}:${cue.id}:${evidenceType}`;

  if (!targetMap.has(key)) {
    targetMap.set(key, {
      id: cue.id,
      label: cue.label,
      kind: cue.kind,
      specificity: cue.specificity,
      weight: cue.weight,
      visibleTo: cue.visibleTo,
      domainId,
      evidenceType,
      sources: [matchPhrase]
    });
    return;
  }

  const existing = targetMap.get(key);
  existing.sources = uniqueValues([...existing.sources, matchPhrase]);
}

function extractExplicitCues(normalizedText, observer, domains, sharedCueLexicon) {
  const cues = new Map();

  for (const cue of sharedCueLexicon) {
    const matchedPhrase = cue.phrases.find((phrase) => phraseMatches(normalizedText, phrase));

    if (matchedPhrase) {
      addCue(cues, cue, matchedPhrase, null, 'explicit');
    }
  }

  for (const domain of domains) {
    for (const cue of domain.cueLexicon) {
      if (!cue.visibleTo.includes(observer.id)) {
        continue;
      }

      const matchedPhrase = cue.phrases.find((phrase) => phraseMatches(normalizedText, phrase));

      if (matchedPhrase) {
        addCue(cues, cue, matchedPhrase, domain.id, 'explicit');
      }
    }
  }

  return [...cues.values()];
}

function inferCues(explicitCues, domains) {
  const cues = new Map();
  const cueIds = new Set(explicitCues.map((cue) => cue.id));

  for (const domain of domains) {
    for (const rule of domain.inferenceRules) {
      const requiresAny = rule.requiresAny ?? [];
      const requiresAll = rule.requiresAll ?? [];
      const anySatisfied = requiresAny.length > 0 && requiresAny.some((cueId) => cueIds.has(cueId));
      const allSatisfied = requiresAll.length > 0 && requiresAll.every((cueId) => cueIds.has(cueId));

      if (!anySatisfied && !allSatisfied) {
        continue;
      }

      addCue(cues, rule.inferredCue, rule.id, domain.id, 'inferred');
    }
  }

  return [...cues.values()];
}

function supportByDomain(allCues, domains) {
  const genericSignal = allCues
    .filter((cue) => cue.domainId === null)
    .reduce((sum, cue) => sum + cue.weight, 0);

  const result = {};

  for (const domain of domains) {
    const explicitSignal = allCues
      .filter((cue) => cue.domainId === domain.id && cue.evidenceType === 'explicit')
      .reduce((sum, cue) => sum + cue.weight, 0);
    const inferredSignal = allCues
      .filter((cue) => cue.domainId === domain.id && cue.evidenceType === 'inferred')
      .reduce((sum, cue) => sum + cue.weight, 0);

    result[domain.id] = genericSignal * 0.3 + explicitSignal + inferredSignal * 0.7;
  }

  return result;
}

function buildConfidenceProfile(allCues, domainSupport) {
  const supportValues = Object.values(domainSupport);
  const sorted = [...supportValues].sort((left, right) => right - left);
  const best = sorted[0] ?? 0;
  const second = sorted[1] ?? 0;
  const totalCueWeight = allCues.reduce((sum, cue) => sum + cue.weight, 0);

  return {
    coverage: clamp(totalCueWeight / 2.4),
    ambiguity: clamp(best === 0 ? 1 : 1 - (best - second) / best)
  };
}

function pickFocusedDomains(domainSupport, maxHypotheses) {
  const ordered = Object.entries(domainSupport).sort((left, right) => right[1] - left[1]);
  const bestSupport = ordered[0]?.[1] ?? 0;
  const threshold = bestSupport > 0 ? bestSupport * 0.6 : 0;
  const focused = ordered
    .filter(([, support]) => support >= threshold)
    .slice(0, Math.max(1, maxHypotheses - 1))
    .map(([domainId]) => domainId);

  if (focused.length > 0) {
    return focused;
  }

  return ordered.slice(0, Math.max(1, maxHypotheses - 1)).map(([domainId]) => domainId);
}

function buildHypothesis({
  id,
  observer,
  text,
  normalizedText,
  tokens,
  explicitCues,
  inferredCues,
  domainSupport,
  focusDomain
}) {
  const selectedCues =
    focusDomain === null
      ? [...explicitCues, ...inferredCues]
      : [...explicitCues, ...inferredCues].filter((cue) => cue.domainId === null || cue.domainId === focusDomain);
  const ambiguities = Object.entries(domainSupport)
    .sort((left, right) => right[1] - left[1])
    .filter(([, support], index, entries) => {
      const best = entries[0]?.[1] ?? 0;
      return best === 0 ? index < 3 : support >= best * 0.75;
    })
    .map(([domainId]) => domainId);

  return {
    id,
    observerId: observer.id,
    focusDomain,
    sourceText: text,
    normalizedText,
    tokens,
    explicitCues: selectedCues.filter((cue) => cue.evidenceType === 'explicit'),
    inferredCues: selectedCues.filter((cue) => cue.evidenceType === 'inferred'),
    supportByDomain: domainSupport,
    ambiguities,
    confidenceProfile: buildConfidenceProfile(selectedCues, domainSupport)
  };
}

function observationalLift(
  text,
  {
    observer,
    domains,
    sharedCueLexicon,
    maxHypotheses = 4
  }
) {
  const normalizedText = normalizeText(text);
  const tokens = tokenize(text);
  const explicitCues = extractExplicitCues(normalizedText, observer, domains, sharedCueLexicon);
  const inferredCues = inferCues(explicitCues, domains);
  const domainSupport = supportByDomain([...explicitCues, ...inferredCues], domains);
  const hypotheses = [
    buildHypothesis({
      id: `${observer.id}-base`,
      observer,
      text,
      normalizedText,
      tokens,
      explicitCues,
      inferredCues,
      domainSupport,
      focusDomain: null
    })
  ];

  for (const domainId of pickFocusedDomains(domainSupport, maxHypotheses)) {
    hypotheses.push(
      buildHypothesis({
        id: `${observer.id}-${domainId}`,
        observer,
        text,
        normalizedText,
        tokens,
        explicitCues,
        inferredCues,
        domainSupport,
        focusDomain: domainId
      })
    );
  }

  return {
    observer,
    hypotheses,
    rawCues: {
      explicit: explicitCues,
      inferred: inferredCues
    }
  };
}

export { observationalLift };
