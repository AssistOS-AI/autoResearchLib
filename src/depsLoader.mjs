import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const parentRoot = resolve(repoRoot, '..');
const parentAchillesEntry = resolve(parentRoot, 'AchillesAgentLib', 'index.mjs');
const nodeModuleSpecifiers = ['achillesAgentLib', 'ploinky-agent-lib'];

function resolveDependencyCandidates() {
  const candidates = [];

  if (existsSync(parentAchillesEntry)) {
    candidates.push({
      source: 'parent-directory',
      specifier: pathToFileURL(parentAchillesEntry).href
    });
  }

  for (const specifier of nodeModuleSpecifiers) {
    candidates.push({
      source: 'node_modules',
      specifier
    });
  }

  return candidates;
}

async function loadAchillesAgentLib() {
  const failures = [];

  for (const candidate of resolveDependencyCandidates()) {
    try {
      const module = await import(candidate.specifier);

      return {
        module,
        source: candidate.source,
        specifier: candidate.specifier
      };
    } catch (error) {
      failures.push(`${candidate.source}:${candidate.specifier} -> ${error.message}`);
    }
  }

  throw new Error(
    `Unable to resolve AchillesAgentLib from the parent directory or node_modules.\n${failures.join('\n')}`
  );
}

async function loadLLMAgentClass() {
  const { module, source, specifier } = await loadAchillesAgentLib();

  if (typeof module.LLMAgent !== 'function') {
    throw new Error(
      `Resolved AchillesAgentLib from ${source} (${specifier}) but it does not export LLMAgent.`
    );
  }

  return {
    LLMAgent: module.LLMAgent,
    source,
    specifier
  };
}

export { loadAchillesAgentLib, loadLLMAgentClass, resolveDependencyCandidates };
