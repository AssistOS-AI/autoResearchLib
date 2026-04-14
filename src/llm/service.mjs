import { loadLLMAgentClass } from '../depsLoader.mjs';
import { createRuntimeConfig } from '../config/runtimeConfig.mjs';
import { buildTaskOptions, isTaskEnabled } from './taskRouting.mjs';
import { analyzeText } from '../pipeline/analyze.mjs';
import { analyzeEvidence, prepareEvidenceInput } from '../usage/libraryUsage.mjs';

function formatPromptSections(sections) {
  return sections
    .filter((section) => section.value !== null && section.value !== undefined && section.value !== '')
    .map((section) => `${section.label}:\n${section.value}`)
    .join('\n\n');
}

async function createConfiguredLLMAgent(configOverrides = {}) {
  const config = createRuntimeConfig(configOverrides);

  if (config.llm.environment.modelsConfigPath) {
    process.env.LLM_MODELS_CONFIG_PATH = config.llm.environment.modelsConfigPath;
  }

  if (config.llm.debug) {
    process.env[config.llm.environment.debugFlagEnv] = 'true';
  }

  const { LLMAgent, source, specifier } = await loadLLMAgentClass();
  const agent = new LLMAgent({ name: config.llm.agentName });

  if (config.llm.debug && typeof agent.setDebugEnabled === 'function') {
    agent.setDebugEnabled(true);
  }

  return {
    agent,
    config,
    dependencySource: source,
    dependencySpecifier: specifier
  };
}

async function runTaggedPrompt({
  taskType,
  prompt,
  responseShape = 'json',
  configOverrides = {},
  llmAgent = null,
  extraContext = {}
}) {
  const config = createRuntimeConfig(configOverrides);

  if (!isTaskEnabled(taskType, config)) {
    return {
      status: 'skipped',
      reason: 'llm-feature-disabled',
      taskType,
      config
    };
  }

  const agentRecord = llmAgent
    ? { agent: llmAgent, config, dependencySource: 'manual-instance', dependencySpecifier: 'manual-instance' }
    : await createConfiguredLLMAgent(config);
  const taskOptions = buildTaskOptions(taskType, config, extraContext);
  const response = await agentRecord.agent.executePrompt(prompt, {
    ...taskOptions,
    responseShape
  });

  return {
    status: 'completed',
    taskType,
    config,
    dependencySource: agentRecord.dependencySource,
    dependencySpecifier: agentRecord.dependencySpecifier,
    response
  };
}

async function normalizeInputWithLLM(inputText, options = {}) {
  const prompt = formatPromptSections([
    {
      label: 'Instruction',
      value:
        'Normalize the input for observational lifting. Preserve meaning, remove noisy surface variation, and return JSON with keys normalizedText, canonicalEntities, canonicalEvents, canonicalRelations, and notes.'
    },
    {
      label: 'Input Text',
      value: inputText
    },
    {
      label: 'Domain Hints',
      value: options.domainHints?.join(', ') ?? ''
    }
  ]);
  const result = await runTaggedPrompt({
    taskType: 'ingestion-normalization',
    prompt,
    responseShape: 'json',
    configOverrides: options.configOverrides,
    llmAgent: options.llmAgent,
    extraContext: {
      stage: 'observational-lifting',
      domainHints: options.domainHints ?? []
    }
  });

  if (result.status !== 'completed') {
    return {
      ...result,
      normalizedText: inputText,
      canonicalEntities: [],
      canonicalEvents: [],
      canonicalRelations: [],
      notes: ['LLM normalization skipped; deterministic text is used unchanged.']
    };
  }

  return {
    ...result,
    normalizedText: result.response.normalizedText ?? inputText,
    canonicalEntities: result.response.canonicalEntities ?? [],
    canonicalEvents: result.response.canonicalEvents ?? [],
    canonicalRelations: result.response.canonicalRelations ?? [],
    notes: result.response.notes ?? []
  };
}

async function conceptualizeAnalysisWithLLM(analysis, options = {}) {
  const prompt = formatPromptSections([
    {
      label: 'Instruction',
      value:
        'Translate the analysis into explicit conceptual output for a human reader. Return JSON with keys summary, definitions, rules, and caveats. Definitions should be short. Rules should be phrased as reusable local principles.'
    },
    {
      label: 'Input Text',
      value: analysis.text
    },
    {
      label: 'Top Domain Distribution',
      value: JSON.stringify(analysis.neighborhood.domainDistribution, null, 2)
    },
    {
      label: 'Robust Invariants',
      value: JSON.stringify(analysis.neighborhood.robustInvariants, null, 2)
    },
    {
      label: 'Recommended Question',
      value: JSON.stringify(analysis.neighborhood.recommendedQuestion, null, 2)
    }
  ]);

  const result = await runTaggedPrompt({
    taskType: 'conceptual-explanation',
    prompt,
    responseShape: 'json',
    configOverrides: options.configOverrides,
    llmAgent: options.llmAgent,
    extraContext: {
      stage: 'conceptual-explanation'
    }
  });

  if (result.status !== 'completed') {
    return {
      ...result,
      summary: null,
      definitions: [],
      rules: [],
      caveats: ['LLM conceptual explanation skipped.']
    };
  }

  return {
    ...result,
    summary: result.response.summary ?? null,
    definitions: result.response.definitions ?? [],
    rules: result.response.rules ?? [],
    caveats: result.response.caveats ?? []
  };
}

async function analyzeTextWithOptionalLLM(inputText, options = {}) {
  const normalization = options.useLLMNormalization
    ? await normalizeInputWithLLM(inputText, options)
    : {
        status: 'skipped',
        reason: 'llm-normalization-not-requested',
        normalizedText: inputText,
        canonicalEntities: [],
        canonicalEvents: [],
        canonicalRelations: [],
        notes: []
      };
  const analysis = analyzeText(normalization.normalizedText, options.analysisOptions ?? {});

  return {
    ...analysis,
    llmNormalization: normalization
  };
}

async function analyzeEvidenceWithOptionalLLM(input, options = {}) {
  const preparedInput = prepareEvidenceInput(input);
  const normalization = options.useLLMNormalization
    ? await normalizeInputWithLLM(preparedInput.text, options)
    : {
        status: 'skipped',
        reason: 'llm-normalization-not-requested',
        normalizedText: preparedInput.text,
        canonicalEntities: [],
        canonicalEvents: [],
        canonicalRelations: [],
        notes: []
      };

  const bundle = analyzeEvidence(
    {
      ...preparedInput,
      text: normalization.normalizedText
    },
    {
      ...(options.analysisOptions ?? {}),
      observerId: options.analysisOptions?.observerId ?? options.observerId,
      runId: options.runId,
      preparation: normalization
    }
  );

  return {
    ...bundle,
    llmNormalization: normalization
  };
}

export {
  analyzeEvidenceWithOptionalLLM,
  analyzeTextWithOptionalLLM,
  conceptualizeAnalysisWithLLM,
  createConfiguredLLMAgent,
  normalizeInputWithLLM,
  runTaggedPrompt
};
