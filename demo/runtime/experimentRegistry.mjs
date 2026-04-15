import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeEvidence, createAnalysisPolicy } from '../../src/index.mjs';
import { analyzeCasePrefix, buildPrefixText, readCases } from '../../experiments/shared/cases.mjs';
import { maskText } from '../../experiments/shared/cueMasking.mjs';
import { analyzeBenchmarkCase, runQuestionBudget } from '../../experiments/shared/benchmarkAnalysis.mjs';
import { readBenchmarkCases, readNoveltyCases } from '../../experiments/shared/benchmarkDataset.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const experimentsRoot = resolve(repoRoot, 'experiments');
const experimentIds = Array.from({ length: 7 }, (_, index) => `experiment${index + 1}`);

const EXTENSION_KIND = {
  '.cnl': 'cnl',
  '.csv': 'table',
  '.json': 'json',
  '.md': 'markdown',
  '.svg': 'figure'
};

const ANSWER_MODE_BY_CONDITION = {
  'clean-gold': 'gold',
  'masked-adversarial': 'adversarial',
  'masked-noisy': 'noisy'
};

let coreCaseMapPromise = null;
let benchmarkCaseMapPromise = null;
let noveltyCaseMapPromise = null;
let catalogPromise = null;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatLabel(value) {
  return String(value ?? '')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function plainMarkdown(markdown) {
  return String(markdown ?? '')
    .replaceAll(/```[\s\S]*?```/g, '')
    .replaceAll(/`([^`]+)`/g, '$1')
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replaceAll(/[*_>#-]/g, ' ')
    .replaceAll(/\|/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function firstParagraph(markdown) {
  const paragraphs = String(markdown ?? '')
    .split(/\n\s*\n/)
    .map((chunk) => plainMarkdown(chunk))
    .filter(Boolean);

  return paragraphs[0] ?? '';
}

function artifactKind(fileName) {
  return EXTENSION_KIND[extname(fileName)] ?? 'file';
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function loadCoreCaseMap() {
  if (!coreCaseMapPromise) {
    coreCaseMapPromise = readCases().then((rows) => new Map(rows.map((row) => [row.id, row])));
  }

  return coreCaseMapPromise;
}

async function loadBenchmarkCaseMap() {
  if (!benchmarkCaseMapPromise) {
    benchmarkCaseMapPromise = readBenchmarkCases().then((rows) => new Map(rows.map((row) => [row.id, row])));
  }

  return benchmarkCaseMapPromise;
}

async function loadNoveltyCaseMap() {
  if (!noveltyCaseMapPromise) {
    noveltyCaseMapPromise = Promise.resolve(readNoveltyCases()).then((rows) => new Map(rows.map((row) => [row.id, row])));
  }

  return noveltyCaseMapPromise;
}

function sortByLabel(left, right) {
  return left.label.localeCompare(right.label);
}

function limitExamples(rows, limit) {
  return rows.slice(0, limit);
}

function interestingExperiment1Rows(summary) {
  return safeArray(summary.caseRows)
    .filter((row) => row.questionAvailable === 1 || Number(row.domainEntropy ?? 0) > 0)
    .sort((left, right) => {
      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      const entropyDelta = Number(right.domainEntropy ?? 0) - Number(left.domainEntropy ?? 0);
      if (entropyDelta !== 0) {
        return entropyDelta;
      }

      const caseDelta = left.caseId.localeCompare(right.caseId);
      if (caseDelta !== 0) {
        return caseDelta;
      }

      return left.observerId.localeCompare(right.observerId);
    });
}

function interestingExperiment3Rows(summary) {
  return safeArray(summary.caseRows)
    .filter((row) => row.conditionId === 'masked' || row.questionId)
    .sort((left, right) => {
      if (left.conditionId !== right.conditionId) {
        return left.conditionId.localeCompare(right.conditionId);
      }

      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      return left.caseId.localeCompare(right.caseId);
    });
}

function interestingExperiment5Rows(summary) {
  return safeArray(summary.caseRows)
    .filter(
      (row) =>
        row.questionAvailable === 1 ||
        row.frontierTopAccuracy === 0 ||
        row.frontierRetentionTruth > row.frontierTopAccuracy
    )
    .sort((left, right) => {
      if (left.frontierTopAccuracy !== right.frontierTopAccuracy) {
        return left.frontierTopAccuracy - right.frontierTopAccuracy;
      }

      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      const stratumDelta = left.stratum.localeCompare(right.stratum);
      if (stratumDelta !== 0) {
        return stratumDelta;
      }

      return left.caseId.localeCompare(right.caseId);
    });
}

function interestingExperiment6Rows(summary) {
  const noveltyRows = safeArray(summary.caseRows)
    .filter((row) => row.caseGroup !== 'in-domain')
    .sort((left, right) => {
      if (left.prefixDepth !== right.prefixDepth) {
        return left.prefixDepth - right.prefixDepth;
      }

      if (left.caseGroup !== right.caseGroup) {
        return left.caseGroup.localeCompare(right.caseGroup);
      }

      return left.caseId.localeCompare(right.caseId);
    });
  const inDomainReference = safeArray(summary.caseRows)
    .filter((row) => row.caseGroup === 'in-domain' && row.prefixDepth === 2)
    .slice(0, 4);

  return [...noveltyRows, ...inDomainReference];
}

function representativeExperiment7Rows(summary) {
  const rows = safeArray(summary.caseRows).filter((row) => row.questionPolicy === 'information-gain');
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.conditionId}:${row.budget}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  return [...groups.entries()]
    .map(([, groupRows]) =>
      groupRows.sort((left, right) => {
        if ((right.rescuedFromWrong ?? 0) !== (left.rescuedFromWrong ?? 0)) {
          return (right.rescuedFromWrong ?? 0) - (left.rescuedFromWrong ?? 0);
        }

        if ((left.finalCorrect ?? 0) !== (right.finalCorrect ?? 0)) {
          return (left.finalCorrect ?? 0) - (right.finalCorrect ?? 0);
        }

        if ((left.truthRetention ?? 0) !== (right.truthRetention ?? 0)) {
          return (left.truthRetention ?? 0) - (right.truthRetention ?? 0);
        }

        if (left.prefixDepth !== right.prefixDepth) {
          return left.prefixDepth - right.prefixDepth;
        }

        return left.caseId.localeCompare(right.caseId);
      })[0]
    )
    .filter(Boolean)
    .sort((left, right) => {
      const conditionDelta = left.conditionId.localeCompare(right.conditionId);
      if (conditionDelta !== 0) {
        return conditionDelta;
      }

      return left.budget - right.budget;
    });
}

function experiment4AblationConfig(id) {
  switch (id) {
    case 'baseline':
      return { observerId: 'rich' };
    case 'coarse-observer':
      return { observerId: 'coarse' };
    case 'no-inferred-cues':
      return {
        observerId: 'rich',
        policy: createAnalysisPolicy({ features: { inferredCues: false } })
      };
    case 'frontier-4':
      return { observerId: 'rich', frontierLimit: 4 };
    case 'frontier-12':
      return { observerId: 'rich', frontierLimit: 12 };
    case 'no-domain-rescue':
      return {
        observerId: 'rich',
        policy: createAnalysisPolicy({ features: { domainRescue: false } })
      };
    case 'no-equivalence':
      return {
        observerId: 'rich',
        policy: createAnalysisPolicy({ features: { equivalenceClasses: false } })
      };
    case 'no-alignment':
      return {
        observerId: 'rich',
        policy: createAnalysisPolicy({
          features: { alignment: false },
          scoreWeights: { alignmentUtility: 0 }
        })
      };
    case 'no-questions':
      return {
        observerId: 'rich',
        policy: createAnalysisPolicy({ features: { questions: false } })
      };
    default:
      throw new Error(`Unknown Experiment 4 ablation "${id}".`);
  }
}

function experiment4SensitivityPolicy(sample) {
  return createAnalysisPolicy({
    supportWeights: sample.supportWeights,
    hypothesisSelection: sample.hypothesisSelection,
    frontier: {
      rescueTolerance: sample.rescueTolerance
    },
    scoreWeights: sample.scoreWeights
  });
}

function createArtifactLinks(experimentId, fileNames) {
  return fileNames
    .filter((fileName) => fileName !== 'run.mjs')
    .map((fileName) => ({
      fileName,
      kind: artifactKind(fileName),
      url: `/artifacts/${experimentId}/${fileName}`
    }))
    .sort((left, right) => {
      const kindDelta = left.kind.localeCompare(right.kind);
      if (kindDelta !== 0) {
        return kindDelta;
      }

      return left.fileName.localeCompare(right.fileName);
    });
}

function createExample(example) {
  const { runSpec, ...publicExample } = example;
  return {
    publicExample,
    runSpec
  };
}

async function buildExperimentExamples(experimentId, summary) {
  if (experimentId === 'experiment1') {
    const coreCases = await loadCoreCaseMap();

    return limitExamples(
      interestingExperiment1Rows(summary).map((row) =>
        createExample({
          id: `${row.caseId}-p${row.prefixDepth}-${row.observerId}`,
          label: `${row.caseId} · prefix ${row.prefixDepth} · ${formatLabel(row.observerId)}`,
          subtitle: `Predicted ${row.predictedDomain} · entropy ${row.domainEntropy}`,
          inputText: buildPrefixText(coreCases.get(row.caseId), row.prefixDepth),
          groundTruthDomain: row.groundTruthDomain,
          metrics: {
            predictedDomain: row.predictedDomain,
            domainEntropy: row.domainEntropy,
            questionAvailable: row.questionAvailable
          },
          runSpec: {
            kind: 'workflow-case',
            caseId: row.caseId,
            prefixDepth: row.prefixDepth,
            observerId: row.observerId
          }
        })
      ),
      24
    );
  }

  if (experimentId === 'experiment2') {
    const coreCases = await loadCoreCaseMap();

    return safeArray(summary.caseRows).map((row) =>
      createExample({
        id: `${row.caseId}-p${row.prefixDepth}-${row.observerId}`,
        label: `${row.caseId} · prefix ${row.prefixDepth} · ${formatLabel(row.observerId)}`,
        subtitle: `${row.questionId} -> ${row.goldAnswer}`,
        inputText: buildPrefixText(coreCases.get(row.caseId), row.prefixDepth),
        groundTruthDomain: coreCases.get(row.caseId)?.groundTruthDomain ?? null,
        metrics: {
          domainBefore: row.domainBefore,
          domainAfter: row.domainAfter,
          informationGain: row.informationGain
        },
        expectedQuestionId: row.questionId,
        expectedAnswer: row.goldAnswer,
        runSpec: {
          kind: 'workflow-case',
          caseId: row.caseId,
          prefixDepth: row.prefixDepth,
          observerId: row.observerId
        }
      })
    );
  }

  if (experimentId === 'experiment3') {
    return limitExamples(
      interestingExperiment3Rows(summary).map((row) =>
        createExample({
          id: `${row.caseId}-${row.conditionId}-p${row.prefixDepth}`,
          label: `${row.caseId} · ${formatLabel(row.conditionId)} · prefix ${row.prefixDepth}`,
          subtitle: `${row.frontierTopDomain} on frontier · lexical ${row.lexicalDomain}`,
          inputText: row.inputText,
          groundTruthDomain: row.groundTruthDomain,
          metrics: {
            frontierTopDomain: row.frontierTopDomain,
            resolvedAccuracy: row.resolvedAccuracy,
            frontierRetainsTruth: row.frontierRetainsTruth
          },
          expectedQuestionId: row.questionId,
          expectedAnswer: row.goldAnswer,
          runSpec: {
            kind: 'masked-workflow-case',
            caseId: row.caseId,
            prefixDepth: row.prefixDepth,
            conditionId: row.conditionId,
            inputText: row.inputText
          }
        })
      ),
      24
    );
  }

  if (experimentId === 'experiment4') {
    const benchmarkCases = [...(await loadBenchmarkCaseMap()).values()]
      .filter((caseRecord) => caseRecord.split === 'test' && caseRecord.stratum === 'controlled')
      .sort((left, right) => left.id.localeCompare(right.id));
    const referenceCase =
      benchmarkCases.find((caseRecord) => caseRecord.id === 'package-manifest__controlled') ?? benchmarkCases[0];
    const ablationExamples = safeArray(summary.ablations)
      .filter((row) =>
        ['baseline', 'coarse-observer', 'frontier-4', 'no-domain-rescue', 'no-questions'].includes(row.id)
      )
      .map((row) =>
        createExample({
          id: `ablation-${row.id}`,
          label: `${formatLabel(row.label)} · ${referenceCase.id} · prefix 2`,
          subtitle: `Accuracy ${row.topAccuracy} · retention ${row.truthRetentionRate}`,
          inputText: referenceCase.segments.slice(0, 2).join(' '),
          groundTruthDomain: referenceCase.groundTruthDomain,
          metrics: {
            topAccuracy: row.topAccuracy,
            truthRetentionRate: row.truthRetentionRate,
            meanEntropy: row.meanEntropy
          },
          runSpec: {
            kind: 'benchmark-policy-case',
            caseId: referenceCase.id,
            prefixDepth: 2,
            variantKind: 'ablation',
            variantId: row.id
          }
        })
      );
    const sampleRows = safeArray(summary.sensitivitySamples);
    const sensitivityExamples = [sampleRows[0], sampleRows[Math.max(sampleRows.length - 1, 0)]]
      .filter(Boolean)
      .map((row) =>
        createExample({
          id: `sample-${row.id}`,
          label: `${row.label} · ${referenceCase.id} · prefix 2`,
          subtitle: `Accuracy ${row.topAccuracy} · agreement ${row.agreementWithBaseline}`,
          inputText: referenceCase.segments.slice(0, 2).join(' '),
          groundTruthDomain: referenceCase.groundTruthDomain,
          metrics: {
            topAccuracy: row.topAccuracy,
            truthRetentionRate: row.truthRetentionRate,
            rescueTolerance: row.rescueTolerance
          },
          runSpec: {
            kind: 'benchmark-policy-case',
            caseId: referenceCase.id,
            prefixDepth: 2,
            variantKind: 'sensitivity-sample',
            variantId: row.id
          }
        })
      );

    return [...ablationExamples, ...sensitivityExamples];
  }

  if (experimentId === 'experiment5') {
    const benchmarkCases = await loadBenchmarkCaseMap();

    return limitExamples(
      interestingExperiment5Rows(summary).map((row) => {
        const caseRecord = benchmarkCases.get(row.caseId);
        return createExample({
          id: `${row.caseId}-p${row.prefixDepth}`,
          label: `${row.sourceCaseId} · ${row.stratum} · prefix ${row.prefixDepth}`,
          subtitle: `${row.frontierTopDomain} vs truth ${row.groundTruthDomain}`,
          inputText: caseRecord?.segments.slice(0, row.prefixDepth).join(' ') ?? '',
          groundTruthDomain: row.groundTruthDomain,
          metrics: {
            frontierTopDomain: row.frontierTopDomain,
            frontierRetentionTruth: row.frontierRetentionTruth,
            questionAvailable: row.questionAvailable
          },
          runSpec: {
            kind: 'benchmark-case',
            caseId: row.caseId,
            prefixDepth: row.prefixDepth
          }
        });
      }),
      24
    );
  }

  if (experimentId === 'experiment6') {
    const benchmarkCases = await loadBenchmarkCaseMap();
    const noveltyCases = await loadNoveltyCaseMap();

    return limitExamples(
      interestingExperiment6Rows(summary).map((row) => {
        const caseRecord =
          row.caseGroup === 'in-domain' ? benchmarkCases.get(row.caseId) : noveltyCases.get(row.caseId);

        return createExample({
          id: `${row.caseId}-p${row.prefixDepth}`,
          label: `${row.caseId} · ${formatLabel(row.caseGroup)} · prefix ${row.prefixDepth}`,
          subtitle: `${row.predictedDomain} · novelty ${row.openSetCandidate}`,
          inputText: caseRecord?.segments.slice(0, row.prefixDepth).join(' ') ?? '',
          groundTruthDomain: row.groundTruthDomain,
          metrics: {
            predictedDomain: row.predictedDomain,
            openSetCandidate: row.openSetCandidate,
            uncertaintyScore: row.uncertaintyScore
          },
          runSpec: {
            kind: row.caseGroup === 'in-domain' ? 'benchmark-case' : 'novelty-case',
            caseId: row.caseId,
            prefixDepth: row.prefixDepth
          }
        });
      }),
      28
    );
  }

  if (experimentId === 'experiment7') {
    const benchmarkCases = await loadBenchmarkCaseMap();

    return representativeExperiment7Rows(summary).map((row) => {
      const caseRecord = benchmarkCases.get(row.caseId);
      const masked = row.conditionId !== 'clean-gold';

      return createExample({
        id: `${row.caseId}-${row.conditionId}-${row.questionPolicy}-b${row.budget}-p${row.prefixDepth}`,
        label: `${formatLabel(row.conditionId)} · budget ${row.budget} · ${row.caseId}`,
        subtitle: `${row.questionPolicy} · final ${row.finalPredictedDomain}`,
        inputText: caseRecord?.segments.slice(0, row.prefixDepth).join(' ') ?? '',
        groundTruthDomain: caseRecord?.groundTruthDomain ?? null,
        metrics: {
          finalPredictedDomain: row.finalPredictedDomain,
          finalCorrect: row.finalCorrect,
          truthRetention: row.truthRetention
        },
        runSpec: {
          kind: 'budget-run',
          caseId: row.caseId,
          prefixDepth: row.prefixDepth,
          questionPolicy: row.questionPolicy,
          budget: row.budget,
          conditionId: row.conditionId,
          answerMode: ANSWER_MODE_BY_CONDITION[row.conditionId] ?? 'gold',
          masked
        }
      });
    });
  }

  return [];
}

async function loadExperimentRecord(experimentId) {
  const experimentDir = resolve(experimentsRoot, experimentId);
  const [summary, descriptionMarkdown, resultsMarkdown, directoryEntries] = await Promise.all([
    readJson(resolve(experimentDir, 'summary.json')),
    readOptionalText(resolve(experimentDir, 'description.md')),
    readOptionalText(resolve(experimentDir, 'results.md')),
    readdir(experimentDir, { withFileTypes: true })
  ]);
  const artifactLinks = createArtifactLinks(
    experimentId,
    directoryEntries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  );
  const examples = await buildExperimentExamples(experimentId, summary);
  const usageExample = summary.usageExample
    ? examples.find((entry) => entry.publicExample.id.startsWith(`${summary.usageExample.caseId}-p${summary.usageExample.prefixDepth}`))
    : null;
  const defaultExample = usageExample ?? examples[0] ?? null;

  return {
    id: experimentId,
    title: summary.title,
    summary,
    descriptionMarkdown,
    resultsMarkdown,
    descriptionPlain: firstParagraph(descriptionMarkdown) || firstParagraph(resultsMarkdown),
    artifactLinks,
    examples,
    defaultExampleId: defaultExample?.publicExample.id ?? null
  };
}

async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = Promise.all(experimentIds.map((experimentId) => loadExperimentRecord(experimentId))).then((records) =>
      new Map(records.map((record) => [record.id, record]))
    );
  }

  return catalogPromise;
}

async function getExperimentRecord(experimentId) {
  const catalog = await loadCatalog();
  const record = catalog.get(experimentId);

  if (!record) {
    throw new Error(`Unknown experiment "${experimentId}".`);
  }

  return record;
}

function publicExperimentDetails(record) {
  return {
    id: record.id,
    title: record.title,
    description: record.descriptionPlain,
    descriptionMarkdown: record.descriptionMarkdown,
    resultsMarkdown: record.resultsMarkdown,
    summary: record.summary,
    artifactLinks: record.artifactLinks,
    examples: record.examples.map((entry) => entry.publicExample).sort(sortByLabel),
    defaultExampleId: record.defaultExampleId
  };
}

async function listExperiments() {
  const catalog = await loadCatalog();

  return [...catalog.values()]
    .map((record) => ({
      id: record.id,
      title: record.title,
      description: record.descriptionPlain,
      artifactCount: record.artifactLinks.length,
      exampleCount: record.examples.length,
      defaultExampleId: record.defaultExampleId
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function getExperimentDetails(experimentId) {
  return publicExperimentDetails(await getExperimentRecord(experimentId));
}

async function lookupExperimentExample(experimentId, exampleId) {
  const record = await getExperimentRecord(experimentId);
  const example =
    record.examples.find((entry) => entry.publicExample.id === exampleId) ??
    record.examples.find((entry) => entry.publicExample.id === record.defaultExampleId);

  if (!example) {
    throw new Error(`Unknown example "${exampleId}" for experiment "${experimentId}".`);
  }

  return {
    record,
    example
  };
}

async function runWorkflowCase(spec, options = {}) {
  const coreCases = await loadCoreCaseMap();
  const caseRecord = coreCases.get(spec.caseId);

  if (!caseRecord) {
    throw new Error(`Unknown workflow case "${spec.caseId}".`);
  }

  const bundle = analyzeCasePrefix(caseRecord, spec.prefixDepth, {
    observerId: spec.observerId ?? 'rich',
    queryBudget: spec.queryBudget,
    traceCollector: options.traceCollector,
    runId: options.runId
  });

  return {
    bundle,
    inputText: buildPrefixText(caseRecord, spec.prefixDepth),
    inputSegments: caseRecord.segments.slice(0, spec.prefixDepth),
    caseRecord
  };
}

async function runMaskedWorkflowCase(spec, options = {}) {
  const coreCases = await loadCoreCaseMap();
  const caseRecord = coreCases.get(spec.caseId);

  if (!caseRecord) {
    throw new Error(`Unknown workflow case "${spec.caseId}".`);
  }

  const inputText =
    spec.inputText ??
    (spec.conditionId === 'masked'
      ? maskText(buildPrefixText(caseRecord, spec.prefixDepth))
      : buildPrefixText(caseRecord, spec.prefixDepth));
  const bundle = analyzeEvidence(
    {
      text: inputText,
      sourceId: caseRecord.id,
      metadata: {
        caseId: caseRecord.id,
        groundTruthDomain: caseRecord.groundTruthDomain,
        prefixDepth: spec.prefixDepth,
        conditionId: spec.conditionId
      }
    },
    {
      observerId: 'rich',
      traceCollector: options.traceCollector,
      runId: options.runId
    }
  );

  return {
    bundle,
    inputText,
    inputSegments: safeArray(bundle.input?.segmentSpans).map((segment) => segment.text),
    caseRecord
  };
}

async function runBenchmarkLikeCase(spec, options = {}, source = 'benchmark') {
  const caseMap = source === 'benchmark' ? await loadBenchmarkCaseMap() : await loadNoveltyCaseMap();
  const caseRecord = caseMap.get(spec.caseId);

  if (!caseRecord) {
    throw new Error(`Unknown ${source} case "${spec.caseId}".`);
  }

  const bundle = analyzeBenchmarkCase(caseRecord, spec.prefixDepth, {
    observerId: spec.observerId ?? 'rich',
    masked: Boolean(spec.masked),
    policy: spec.policy,
    frontierLimit: spec.frontierLimit,
    queryBudget: spec.queryBudget,
    traceCollector: options.traceCollector,
    runId: options.runId
  });

  return {
    bundle,
    inputText: caseRecord.segments.slice(0, spec.prefixDepth).join(' '),
    inputSegments: caseRecord.segments.slice(0, spec.prefixDepth),
    caseRecord
  };
}

async function runExperiment4Preset(record, spec, options = {}) {
  const variantConfig =
    spec.variantKind === 'ablation'
      ? experiment4AblationConfig(spec.variantId)
      : {
          observerId: 'rich',
          policy: experiment4SensitivityPolicy(
            safeArray(record.summary.sensitivitySamples).find((entry) => entry.id === spec.variantId)
          )
        };

  return runBenchmarkLikeCase(
    {
      caseId: spec.caseId,
      prefixDepth: spec.prefixDepth,
      observerId: variantConfig.observerId,
      policy: variantConfig.policy,
      frontierLimit: variantConfig.frontierLimit
    },
    options,
    'benchmark'
  );
}

async function runBudgetExample(spec, options = {}) {
  const benchmarkCases = await loadBenchmarkCaseMap();
  const caseRecord = benchmarkCases.get(spec.caseId);

  if (!caseRecord) {
    throw new Error(`Unknown benchmark case "${spec.caseId}".`);
  }

  const run = runQuestionBudget(caseRecord, {
    prefixDepth: spec.prefixDepth,
    budget: spec.budget,
    questionPolicy: spec.questionPolicy,
    answerMode: spec.answerMode,
    masked: spec.masked,
    observerId: 'rich',
    traceCollector: options.traceCollector,
    runId: options.runId
  });

  return {
    bundle: run.finalBundle,
    inputText: caseRecord.segments.slice(0, spec.prefixDepth).join(' '),
    inputSegments: caseRecord.segments.slice(0, spec.prefixDepth),
    caseRecord,
    steps: run.steps
  };
}

async function runExampleSpec(record, example, options = {}) {
  const spec = example.runSpec;

  if (spec.kind === 'workflow-case') {
    return runWorkflowCase(spec, options);
  }

  if (spec.kind === 'masked-workflow-case') {
    return runMaskedWorkflowCase(spec, options);
  }

  if (spec.kind === 'benchmark-case') {
    return runBenchmarkLikeCase(spec, options, 'benchmark');
  }

  if (spec.kind === 'novelty-case') {
    return runBenchmarkLikeCase(spec, options, 'novelty');
  }

  if (spec.kind === 'benchmark-policy-case') {
    return runExperiment4Preset(record, spec, options);
  }

  if (spec.kind === 'budget-run') {
    return runBudgetExample(spec, options);
  }

  throw new Error(`Unsupported run kind "${spec.kind}".`);
}

async function runExperimentExample(experimentId, exampleId, options = {}) {
  const { record, example } = await lookupExperimentExample(experimentId, exampleId);
  const executed = await runExampleSpec(record, example, options);

  return {
    experimentId,
    title: record.title,
    description: record.descriptionPlain,
    artifactLinks: record.artifactLinks,
    aggregateSummary: record.summary,
    example: example.publicExample,
    exampleId: example.publicExample.id,
    bundle: executed.bundle,
    trace: options.traceCollector?.exportTrace?.() ?? { rawEvents: [], snapshots: [] },
    extra: {
      example: example.publicExample,
      inputText: executed.inputText,
      inputSegments: executed.inputSegments,
      expectedQuestionId: example.publicExample.expectedQuestionId ?? null,
      expectedAnswer: example.publicExample.expectedAnswer ?? null,
      steps: executed.steps ?? [],
      rawDocuments: {
        descriptionMarkdown: record.descriptionMarkdown,
        resultsMarkdown: record.resultsMarkdown
      }
    }
  };
}

export { getExperimentDetails, listExperiments, lookupExperimentExample, runExperimentExample };
