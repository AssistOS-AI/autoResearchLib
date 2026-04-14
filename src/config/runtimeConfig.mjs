function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return source === undefined ? target : source;
  }

  const base = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      base[key] = [...value];
      continue;
    }

    if (value && typeof value === 'object') {
      base[key] = deepMerge(base[key], value);
      continue;
    }

    if (value !== undefined) {
      base[key] = value;
    }
  }

  return base;
}

function envString(key, fallback = null) {
  return process.env[key] && process.env[key].trim() ? process.env[key].trim() : fallback;
}

function tierConfig(prefix, fallbackTier) {
  return {
    tier: envString(`${prefix}_TIER`, fallbackTier),
    model: envString(`${prefix}_MODEL`)
  };
}

function createBaseConfig() {
  return {
    dependencyResolution: {
      preferParentAchilles: true,
      fallbackNodeModules: true
    },
    llm: {
      enabled: parseBoolean(process.env.AUTORESEARCHLIB_LLM_ENABLED, false),
      agentName: envString('AUTORESEARCHLIB_LLM_AGENT_NAME', 'autoResearchLibLLM'),
      debug: parseBoolean(process.env.AUTORESEARCHLIB_LLM_DEBUG, false),
      environment: {
        modelsConfigPath: envString('LLM_MODELS_CONFIG_PATH'),
        debugFlagEnv: 'LLMAgentClient_DEBUG'
      },
      features: {
        ingestionNormalization: parseBoolean(
          process.env.AUTORESEARCHLIB_LLM_INGESTION_ENABLED,
          false
        ),
        conceptualExplanation: parseBoolean(
          process.env.AUTORESEARCHLIB_LLM_CONCEPTUALIZATION_ENABLED,
          false
        )
      },
      tiers: {
        routing: tierConfig('AUTORESEARCHLIB_LLM_ROUTING', 'fast'),
        ingestionNormalization: tierConfig('AUTORESEARCHLIB_LLM_INGESTION', 'plan'),
        conceptualExplanation: tierConfig('AUTORESEARCHLIB_LLM_CONCEPTUALIZATION', 'write'),
        researchSynthesis: tierConfig('AUTORESEARCHLIB_LLM_RESEARCH', 'deep')
      }
    },
    articleBuild: {
      skillName: 'article-build',
      incremental: parseBoolean(process.env.AUTORESEARCHLIB_ARTICLE_INCREMENTAL, true),
      articleRoot: envString('AUTORESEARCHLIB_ARTICLE_ROOT', 'docs/article')
    }
  };
}

let manualOverrides = {};

function createRuntimeConfig(overrides = {}) {
  return deepMerge(
    deepMerge(clone(createBaseConfig()), manualOverrides),
    overrides
  );
}

function setManualConfigOverrides(overrides = {}) {
  manualOverrides = deepMerge(manualOverrides, overrides);
  return createRuntimeConfig();
}

function replaceManualConfigOverrides(overrides = {}) {
  manualOverrides = clone(overrides);
  return createRuntimeConfig();
}

function clearManualConfigOverrides() {
  manualOverrides = {};
  return createRuntimeConfig();
}

function getManualConfigOverrides() {
  return clone(manualOverrides);
}

export {
  clearManualConfigOverrides,
  createRuntimeConfig,
  getManualConfigOverrides,
  replaceManualConfigOverrides,
  setManualConfigOverrides
};
