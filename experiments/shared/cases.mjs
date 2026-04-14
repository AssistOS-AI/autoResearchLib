import { readFile } from 'node:fs/promises';
import { analyzeEvidence, applyEvidenceUpdate } from '../../src/index.mjs';

const casesPath = new URL('../../data/inputs/workflow-cases.json', import.meta.url);

async function readCases() {
  return JSON.parse(await readFile(casesPath, 'utf8'));
}

function buildPrefixText(caseRecord, depth) {
  return caseRecord.segments.slice(0, depth).join(' ');
}

function topDomain(analysis) {
  return analysis.neighborhood.domainDistribution[0]?.domainId ?? null;
}

function analyzeCasePrefix(caseRecord, depth, options = {}) {
  return analyzeEvidence(
    {
      sourceId: caseRecord.id,
      segments: caseRecord.segments.slice(0, depth),
      metadata: {
        caseId: caseRecord.id,
        groundTruthDomain: caseRecord.groundTruthDomain,
        prefixDepth: depth
      }
    },
    options
  );
}

function applyCaseAnswer(bundle, observedAnswer, options = {}) {
  return applyEvidenceUpdate(bundle, observedAnswer, options);
}

export { analyzeCasePrefix, applyCaseAnswer, buildPrefixText, readCases, topDomain };
