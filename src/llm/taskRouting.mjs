const TASK_ROUTES = {
  'ingestion-normalization': {
    feature: 'ingestionNormalization',
    tierKey: 'ingestionNormalization',
    intent: 'normalize-observation-input',
    tags: ['ingestion', 'normalization', 'observational-lifting']
  },
  'conceptual-explanation': {
    feature: 'conceptualExplanation',
    tierKey: 'conceptualExplanation',
    intent: 'conceptualize-analysis-result',
    tags: ['conceptualization', 'definitions', 'rules', 'explanation']
  }
};

function getTaskRoute(taskType) {
  const route = TASK_ROUTES[taskType];

  if (!route) {
    throw new Error(`Unknown LLM task type "${taskType}".`);
  }

  return route;
}

function buildTaskOptions(taskType, config, extraContext = {}) {
  const route = getTaskRoute(taskType);
  const tierConfig = config.llm.tiers[route.tierKey];

  return {
    tier: tierConfig?.tier ?? 'fast',
    model: tierConfig?.model ?? null,
    tags: [...route.tags],
    context: {
      intent: route.intent,
      taskType,
      tags: [...route.tags],
      ...extraContext
    }
  };
}

function isTaskEnabled(taskType, config) {
  const route = getTaskRoute(taskType);

  return Boolean(config.llm.enabled && config.llm.features[route.feature]);
}

export { TASK_ROUTES, buildTaskOptions, getTaskRoute, isTaskEnabled };
