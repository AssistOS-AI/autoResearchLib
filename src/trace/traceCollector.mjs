const TRACE_OBJECT_REF_KEYS = [
  'runIds',
  'segmentIds',
  'cueIds',
  'hypothesisIds',
  'theoryIds',
  'equivalenceIds',
  'questionIds',
  'domainIds'
];

function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeRefValue(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...new Set(value.filter((entry) => entry !== null && entry !== undefined).map(String))];
  }

  return [String(value)];
}

function normalizeObjectRefs(objectRefs = {}) {
  const normalized = {};

  for (const key of TRACE_OBJECT_REF_KEYS) {
    const values = normalizeRefValue(objectRefs[key]);

    if (values.length > 0) {
      normalized[key] = values;
    }
  }

  for (const [key, value] of Object.entries(objectRefs)) {
    if (TRACE_OBJECT_REF_KEYS.includes(key)) {
      continue;
    }

    const values = normalizeRefValue(value);

    if (values.length > 0) {
      normalized[key] = values;
    }
  }

  return normalized;
}

function normalizeMetrics(metrics = {}) {
  return Object.fromEntries(
    Object.entries(metrics).filter(([, value]) => value !== undefined && value !== null)
  );
}

function buildMetricsDelta(previousMetrics, nextMetrics) {
  const delta = {};

  for (const [key, nextValue] of Object.entries(nextMetrics)) {
    const previousValue = previousMetrics[key];

    if (previousValue === undefined) {
      delta[key] = { before: null, after: nextValue };
      continue;
    }

    if (typeof previousValue === 'number' && typeof nextValue === 'number') {
      delta[key] = {
        before: previousValue,
        after: nextValue,
        delta: nextValue - previousValue
      };
      continue;
    }

    if (previousValue !== nextValue) {
      delta[key] = {
        before: previousValue,
        after: nextValue
      };
    }
  }

  return delta;
}

function createTraceCollector(initialContext = {}) {
  const events = [];
  const snapshots = [];
  let eventCounter = 0;
  let snapshotCounter = 0;
  let context = cloneValue(initialContext) ?? {};
  let latestMetrics = {};

  function setContext(partialContext = {}) {
    context = {
      ...context,
      ...cloneValue(partialContext)
    };

    return cloneValue(context);
  }

  function snapshot(stage, payload = {}, options = {}) {
    const metrics = normalizeMetrics(options.metrics ?? {});
    const snapshotRecord = {
      id: options.id ?? `snap-${stage}-${String(++snapshotCounter).padStart(4, '0')}`,
      stage,
      summary: options.summary ?? null,
      metrics,
      payload: cloneValue(payload)
    };

    snapshots.push(snapshotRecord);
    return snapshotRecord.id;
  }

  function emit({
    stage,
    kind,
    importance = 'normal',
    summary = '',
    objectRefs = {},
    metrics = {},
    payload = {},
    snapshotId = null,
    parentId = null
  }) {
    const normalizedMetrics = normalizeMetrics(metrics);
    const metricsDelta = buildMetricsDelta(latestMetrics, normalizedMetrics);

    if (Object.keys(normalizedMetrics).length > 0) {
      latestMetrics = {
        ...latestMetrics,
        ...normalizedMetrics
      };
    }

    const event = {
      id: `evt-${String(++eventCounter).padStart(5, '0')}`,
      parentId,
      stage,
      kind,
      importance,
      summary,
      objectRefs: normalizeObjectRefs(objectRefs),
      metricsDelta,
      payload: cloneValue(payload),
      snapshotId
    };

    events.push(event);
    return cloneValue(event);
  }

  function exportTrace() {
    return {
      context: cloneValue(context),
      rawEvents: cloneValue(events),
      snapshots: cloneValue(snapshots)
    };
  }

  return {
    emit,
    exportTrace,
    setContext,
    snapshot
  };
}

export { TRACE_OBJECT_REF_KEYS, createTraceCollector };
