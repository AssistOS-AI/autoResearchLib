import { clamp } from './frontier.mjs';
import { normalizeText, phraseMatches, tokenize } from './text.mjs';

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSpan(span) {
  if (typeof span !== 'string') {
    return { start: 0, end: 0 };
  }

  const [rawStart, rawEnd] = span.split('-').map((value) => Number(value));
  return {
    start: Number.isFinite(rawStart) ? rawStart : 0,
    end: Number.isFinite(rawEnd) ? rawEnd : rawStart
  };
}

function normalizeSources(sourceRecords) {
  if (Array.isArray(sourceRecords)) {
    return sourceRecords;
  }

  if (sourceRecords === null || sourceRecords === undefined) {
    return [];
  }

  if (typeof sourceRecords === 'string') {
    return [
      {
        kind: 'matched-phrase',
        text: sourceRecords
      }
    ];
  }

  return [sourceRecords];
}

function mergeSources(existingSources, additionalSources) {
  const seen = new Set(existingSources.map((source) => JSON.stringify(source)));

  for (const source of additionalSources) {
    const key = JSON.stringify(source);

    if (seen.has(key)) {
      continue;
    }

    existingSources.push(source);
    seen.add(key);
  }

  return existingSources;
}

function buildExplicitSources(segmentSpans = [], phrase) {
  const pattern = new RegExp(`\\b${escapePattern(String(phrase).toLowerCase())}\\b`, 'g');
  const matches = [];

  for (const segment of segmentSpans) {
    const lowered = segment.text.toLowerCase();
    let match;

    while ((match = pattern.exec(lowered)) !== null) {
      const segmentSpan = parseSpan(segment.span);
      const start = segmentSpan.start + match.index;
      const end = start + phrase.length - 1;
      matches.push({
        kind: 'matched-span',
        segmentId: segment.id,
        span: `${start}-${end}`,
        text: phrase
      });
    }

    pattern.lastIndex = 0;
  }

  return matches.length > 0
    ? matches
    : [
        {
          kind: 'matched-phrase',
          text: phrase
        }
      ];
}

function addCue(targetMap, cue, sourceRecords, domainId, evidenceType = 'explicit') {
  const key = `${domainId ?? 'shared'}:${cue.id}:${evidenceType}`;
  const normalizedSources = normalizeSources(sourceRecords);

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
       sources: normalizedSources
     });
     return;
   }

  const existing = targetMap.get(key);
  existing.sources = mergeSources(existing.sources, normalizedSources);
}

function extractExplicitCues(normalizedText, observer, domains, sharedCueLexicon, segmentSpans = []) {
  const cues = new Map();

  for (const cue of sharedCueLexicon) {
    const matchedPhrase = cue.phrases.find((phrase) => phraseMatches(normalizedText, phrase));

    if (matchedPhrase) {
      addCue(cues, cue, buildExplicitSources(segmentSpans, matchedPhrase), null, 'explicit');
    }
  }

  for (const domain of domains) {
    for (const cue of domain.cueLexicon) {
      if (!cue.visibleTo.includes(observer.id)) {
        continue;
      }

      const matchedPhrase = cue.phrases.find((phrase) => phraseMatches(normalizedText, phrase));

      if (matchedPhrase) {
        addCue(cues, cue, buildExplicitSources(segmentSpans, matchedPhrase), domain.id, 'explicit');
      }
    }
  }

  return [...cues.values()];
}

function inferCues(explicitCues, domains, enabled = true) {
  if (!enabled) {
    return [];
  }

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

      addCue(
        cues,
        rule.inferredCue,
        {
          kind: 'inference-rule',
          ruleId: rule.id
        },
        domain.id,
        'inferred'
      );
    }
  }

  return [...cues.values()];
}

function supportByDomain(allCues, domains, signalWeights) {
  const genericSignal = allCues
    .filter((cue) => cue.domainId === null)
    .reduce((sum, cue) => sum + cue.weight, 0);
  const genericWeight = signalWeights?.generic ?? 0.3;
  const explicitWeight = signalWeights?.explicit ?? 1;
  const inferredWeight = signalWeights?.inferred ?? 0.7;

  const result = {};

  for (const domain of domains) {
    const explicitSignal = allCues
      .filter((cue) => cue.domainId === domain.id && cue.evidenceType === 'explicit')
      .reduce((sum, cue) => sum + cue.weight, 0);
    const inferredSignal = allCues
      .filter((cue) => cue.domainId === domain.id && cue.evidenceType === 'inferred')
      .reduce((sum, cue) => sum + cue.weight, 0);

    result[domain.id] = genericSignal * genericWeight + explicitSignal * explicitWeight + inferredSignal * inferredWeight;
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

function pickFocusedDomains(domainSupport, maxHypotheses, focusRatio = 0.6) {
  const ordered = Object.entries(domainSupport).sort((left, right) => right[1] - left[1]);
  const bestSupport = ordered[0]?.[1] ?? 0;
  const threshold = bestSupport > 0 ? bestSupport * focusRatio : 0;
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
  focusDomain,
  ambiguityRatio = 0.75
}) {
  const selectedCues =
    focusDomain === null
      ? [...explicitCues, ...inferredCues]
      : [...explicitCues, ...inferredCues].filter((cue) => cue.domainId === null || cue.domainId === focusDomain);
  const ambiguities = Object.entries(domainSupport)
    .sort((left, right) => right[1] - left[1])
    .filter(([, support], index, entries) => {
      const best = entries[0]?.[1] ?? 0;
      return best === 0 ? index < 3 : support >= best * ambiguityRatio;
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
    maxHypotheses = 4,
    policy,
    segmentSpans = []
  }
) {
  const normalizedText = normalizeText(text);
  const tokens = tokenize(text);
  const explicitCues = extractExplicitCues(normalizedText, observer, domains, sharedCueLexicon, segmentSpans);
  const inferredCues = inferCues(explicitCues, domains, policy?.features?.inferredCues !== false);
  const domainSupport = supportByDomain([...explicitCues, ...inferredCues], domains, policy?.supportWeights);
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
      focusDomain: null,
      ambiguityRatio: policy?.hypothesisSelection?.ambiguityRatio
    })
  ];

  for (const domainId of pickFocusedDomains(domainSupport, maxHypotheses, policy?.hypothesisSelection?.focusRatio)) {
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
        focusDomain: domainId,
        ambiguityRatio: policy?.hypothesisSelection?.ambiguityRatio
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
