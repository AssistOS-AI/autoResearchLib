import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearManualConfigOverrides,
  createRuntimeConfig,
  normalizeInputWithLLM,
  resolveDependencyCandidates,
  setManualConfigOverrides
} from '../src/index.mjs';

test('dependency resolution prefers the parent Achilles checkout', () => {
  const candidates = resolveDependencyCandidates();

  assert.equal(candidates[0].source, 'parent-directory');
  assert.match(candidates[0].specifier, /AchillesAgentLib\/index\.mjs$/);
});

test('manual config overrides extend environment-derived defaults', () => {
  clearManualConfigOverrides();
  setManualConfigOverrides({
    llm: {
      enabled: true,
      features: {
        conceptualExplanation: true
      }
    }
  });

  const config = createRuntimeConfig({
    llm: {
      agentName: 'test-agent'
    }
  });

  assert.equal(config.llm.enabled, true);
  assert.equal(config.llm.features.conceptualExplanation, true);
  assert.equal(config.llm.agentName, 'test-agent');

  clearManualConfigOverrides();
});

test('optional LLM helpers report skipped status when features are disabled', async () => {
  const result = await normalizeInputWithLLM('plain text', {
    configOverrides: {
      llm: {
        enabled: false
      }
    }
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.normalizedText, 'plain text');
  assert.equal(result.intent, 'normalize-ingestion');
  assert.equal(result.tier, 'plan');
  assert.deepEqual(result.tags, ['ingestion', 'normalization', 'pre-lift', 'bounded-llm']);
});
