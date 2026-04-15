function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function metricless(event) {
  return !event.metricsDelta || Object.keys(event.metricsDelta).length === 0;
}

function primarySegmentId(event) {
  return event.objectRefs?.segmentIds?.[0] ?? 'unscoped';
}

function baseTheoryKey(event) {
  const theoryId = event.objectRefs?.theoryIds?.[0] ?? '';
  return theoryId.split(':').slice(0, 2).join(':') || theoryId;
}

function compressCueCluster(events, startIndex) {
  const first = events[startIndex];
  const group = [first];
  const segmentId = primarySegmentId(first);
  let index = startIndex + 1;

  while (index < events.length) {
    const candidate = events[index];

    if (!['cue.explicit.matched', 'cue.inferred.added'].includes(candidate.kind)) {
      break;
    }

    if (candidate.snapshotId !== first.snapshotId || primarySegmentId(candidate) !== segmentId) {
      break;
    }

    group.push(candidate);
    index += 1;
  }

  if (group.length === 1) {
    return {
      events: [first],
      nextIndex: startIndex + 1
    };
  }

  return {
    events: [
      {
        ...first,
        kind: 'cue.cluster',
        summary: `Cue cluster for ${segmentId}`,
        payload: {
          segmentId,
          cues: group.map((event) => ({
            kind: event.kind,
            cueIds: event.objectRefs?.cueIds ?? [],
            domainIds: event.objectRefs?.domainIds ?? [],
            payload: event.payload
          }))
        }
      }
    ],
    nextIndex: index
  };
}

function compressVariantFan(events, startIndex) {
  const first = events[startIndex];
  const group = [first];
  const key = baseTheoryKey(first);
  let index = startIndex + 1;

  while (index < events.length) {
    const candidate = events[index];

    if (candidate.kind !== 'theory.variant.expanded') {
      break;
    }

    if (candidate.snapshotId !== first.snapshotId || baseTheoryKey(candidate) !== key) {
      break;
    }

    group.push(candidate);
    index += 1;
  }

  if (group.length === 1) {
    return {
      events: [first],
      nextIndex: startIndex + 1
    };
  }

  return {
    events: [
      {
        ...first,
        kind: 'variant.fan',
        summary: `Variant fan for ${key}`,
        payload: {
          baseTheory: key,
          variants: group.map((event) => ({
            theoryId: event.objectRefs?.theoryIds?.[0] ?? null,
            variant: event.payload?.variant ?? null
          }))
        }
      }
    ],
    nextIndex: index
  };
}

function compressScoreBlock(events, startIndex) {
  const first = events[startIndex];
  const group = [first];
  let index = startIndex + 1;

  while (index < events.length) {
    const candidate = events[index];

    if (!['frontier.member.retained', 'frontier.member.rescued'].includes(candidate.kind)) {
      break;
    }

    if (candidate.snapshotId !== first.snapshotId) {
      break;
    }

    group.push(candidate);
    index += 1;
  }

  if (group.length === 1) {
    return {
      events: [first],
      nextIndex: startIndex + 1
    };
  }

  return {
    events: [
      {
        ...first,
        kind: 'score.block',
        summary: `Frontier score block with ${group.length} members`,
        payload: {
          members: group.map((event) => ({
            kind: event.kind,
            theoryId: event.objectRefs?.theoryIds?.[0] ?? null,
            domainId: event.objectRefs?.domainIds?.[0] ?? null,
            scoreProfile: event.payload?.scoreProfile ?? null
          }))
        }
      }
    ],
    nextIndex: index
  };
}

function compressQuestionTail(events, startIndex) {
  const first = events[startIndex];
  const group = [first];
  let index = startIndex + 1;

  while (index < events.length) {
    const candidate = events[index];

    if (candidate.kind !== 'question.scored' || candidate.snapshotId !== first.snapshotId) {
      break;
    }

    group.push(candidate);
    index += 1;
  }

  if (group.length <= 1) {
    return {
      events: [first],
      nextIndex: startIndex + 1
    };
  }

  const [recommended, ...tail] = group;

  return {
    events: [
      recommended,
      {
        ...tail[0],
        kind: 'question.tail',
        summary: `Collapsed ${tail.length} lower-gain question candidates`,
        payload: {
          questions: tail.map((event) => ({
            questionId: event.objectRefs?.questionIds?.[0] ?? null,
            informationGain: event.payload?.informationGain ?? null
          }))
        }
      }
    ],
    nextIndex: index
  };
}

function compressSteadyFrontier(events) {
  const compressed = [];

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];

    if (!(metricless(event) && event.stage === 'frontier')) {
      compressed.push(event);
      continue;
    }

    const group = [event];
    let cursor = index + 1;

    while (cursor < events.length && metricless(events[cursor]) && events[cursor].stage === 'frontier') {
      group.push(events[cursor]);
      cursor += 1;
    }

    if (group.length === 1) {
      compressed.push(event);
      continue;
    }

    compressed.push({
      ...event,
      kind: 'steady.frontier',
      summary: `Collapsed ${group.length} frontier-stable events`,
      payload: {
        events: group.map((entry) => ({
          kind: entry.kind,
          theoryId: entry.objectRefs?.theoryIds?.[0] ?? null
        }))
      }
    });
    index = cursor - 1;
  }

  return compressed;
}

function compressDefault(rawEvents) {
  const grouped = [];

  for (let index = 0; index < rawEvents.length; ) {
    const event = rawEvents[index];
    let result = null;

    if (['cue.explicit.matched', 'cue.inferred.added'].includes(event.kind)) {
      result = compressCueCluster(rawEvents, index);
    } else if (event.kind === 'theory.variant.expanded') {
      result = compressVariantFan(rawEvents, index);
    } else if (['frontier.member.retained', 'frontier.member.rescued'].includes(event.kind)) {
      result = compressScoreBlock(rawEvents, index);
    } else if (event.kind === 'question.scored') {
      result = compressQuestionTail(rawEvents, index);
    }

    if (!result) {
      grouped.push(event);
      index += 1;
      continue;
    }

    grouped.push(...result.events);
    index = result.nextIndex;
  }

  return compressSteadyFrontier(grouped);
}

function compressPresentation(events) {
  const presentationKinds = new Set([
    'run.started',
    'observation.completed',
    'induction.completed',
    'neighborhood.expanded',
    'frontier.updated',
    'question.selected',
    'question.answered',
    'update.applied',
    'novelty.assessed',
    'alignment.completed',
    'completed.materialized',
    'run.completed'
  ]);

  return events.filter((event) => presentationKinds.has(event.kind) || event.importance === 'high');
}

function compressTrace(trace, detail = 'default') {
  const rawEvents = cloneValue(trace?.rawEvents ?? []);

  if (detail === 'full') {
    return rawEvents;
  }

  const defaultEvents = compressDefault(rawEvents);

  if (detail === 'presentation') {
    return compressPresentation(defaultEvents);
  }

  return defaultEvents;
}

export { compressTrace };
