import { analyzeEvidence, applyEvidenceUpdate } from '../../src/index.mjs';
import { benchmarkDomains } from '../../src/domains/benchmarkDomains.mjs';
import { maskText } from './cueMasking.mjs';
import { createSeededRng } from './statistics.mjs';

function topDomain(analysis) {
  return analysis.neighborhood.domainDistribution[0]?.domainId ?? null;
}

function buildBenchmarkPrefixText(caseRecord, prefixDepth) {
  return caseRecord.segments.slice(0, prefixDepth).join(' ');
}

function buildBenchmarkPrefixSegments(caseRecord, prefixDepth, masked = false) {
  const segments = caseRecord.segments.slice(0, prefixDepth);
  return masked ? segments.map((segment) => maskText(segment)) : segments;
}

function stringSeed(value) {
  return [...String(value)].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function analyzeBenchmarkCase(
  caseRecord,
  prefixDepth,
  { observerId = 'rich', domains = benchmarkDomains, policy, masked = false, frontierLimit, maxHypotheses } = {}
) {
  const segments = buildBenchmarkPrefixSegments(caseRecord, prefixDepth, masked);

  return analyzeEvidence(
    {
      text: segments.join(' '),
      segments,
      sourceId: caseRecord.id,
      metadata: {
        caseId: caseRecord.id,
        groundTruthDomain: caseRecord.groundTruthDomain,
        prefixDepth,
        masked,
        split: caseRecord.split ?? 'test',
        stratum: caseRecord.stratum ?? 'controlled',
        noveltyType: caseRecord.noveltyType ?? 'known'
      }
    },
    {
      observerId,
      domains,
      policy,
      frontierLimit,
      maxHypotheses,
      runId: `${caseRecord.id}_${masked ? 'masked' : 'clean'}_p${prefixDepth}_${observerId}`
    }
  );
}

function selectQuestion(bundle, questionPolicy, rng) {
  const candidates = bundle.analysis.neighborhood.questionCandidates ?? [];

  if (candidates.length === 0) {
    return null;
  }

  if (questionPolicy === 'random') {
    return candidates[Math.floor(rng() * candidates.length)];
  }

  if (questionPolicy === 'top-domain') {
    const currentTopDomain = topDomain(bundle.analysis);
    return (
      candidates.find((question) => question.answerMap[currentTopDomain] === 'yes') ??
      candidates[0]
    );
  }

  return bundle.analysis.neighborhood.recommendedQuestion ?? candidates[0];
}

function flipBinaryAnswer(answer) {
  return answer === 'yes' ? 'no' : 'yes';
}

function chooseAdversarialAnswer(bundle, question, caseRecord) {
  const candidates = ['yes', 'no'].map((answer) => {
    const updated = applyEvidenceUpdate(bundle, answer, { questionId: question.id });
    const predicted = topDomain(updated.analysis);
    const retainedTruth = caseRecord.groundTruthDomain
      ? updated.analysis.neighborhood.frontier.some((theory) => theory.domainId === caseRecord.groundTruthDomain)
      : false;

    return {
      answer,
      predicted,
      correct: caseRecord.groundTruthDomain ? Number(predicted === caseRecord.groundTruthDomain) : 0,
      retainedTruth: Number(retainedTruth),
      entropy: updated.analysis.neighborhood.domainEntropy,
      confidence: updated.analysis.neighborhood.domainDistribution[0]?.weight ?? 0
    };
  });

  return candidates.sort((left, right) => {
    if (left.correct !== right.correct) {
      return left.correct - right.correct;
    }

    if (left.retainedTruth !== right.retainedTruth) {
      return left.retainedTruth - right.retainedTruth;
    }

    if (left.entropy !== right.entropy) {
      return right.entropy - left.entropy;
    }

    return right.confidence - left.confidence;
  })[0].answer;
}

function observedAnswerForMode(bundle, caseRecord, question, answerMode, stepIndex, rng) {
  const goldAnswer = caseRecord.answers?.[question.id] ?? 'no';

  if (answerMode === 'adversarial') {
    return chooseAdversarialAnswer(bundle, question, caseRecord);
  }

  if (answerMode === 'contradictory') {
    return stepIndex % 2 === 1 ? flipBinaryAnswer(goldAnswer) : goldAnswer;
  }

  if (answerMode === 'noisy') {
    return rng() < 0.25 ? flipBinaryAnswer(goldAnswer) : goldAnswer;
  }

  return goldAnswer;
}

function runQuestionBudget(
  caseRecord,
  {
    prefixDepth,
    budget,
    questionPolicy = 'information-gain',
    answerMode = 'gold',
    observerId = 'rich',
    domains = benchmarkDomains,
    policy,
    masked = false,
    frontierLimit,
    maxHypotheses
  }
) {
  const initialBundle = analyzeBenchmarkCase(caseRecord, prefixDepth, {
    observerId,
    domains,
    policy,
    masked,
    frontierLimit,
    maxHypotheses
  });
  const rng = createSeededRng(stringSeed(`${caseRecord.id}:${prefixDepth}:${questionPolicy}:${answerMode}:${masked}`));
  let bundle = initialBundle;
  const steps = [];

  for (let stepIndex = 0; stepIndex < budget; stepIndex += 1) {
    const question = selectQuestion(bundle, questionPolicy, rng);

    if (!question) {
      break;
    }

    const predictedBefore = topDomain(bundle.analysis);
    const entropyBefore = bundle.analysis.neighborhood.domainEntropy;
    const observedAnswer = observedAnswerForMode(bundle, caseRecord, question, answerMode, stepIndex, rng);
    bundle = applyEvidenceUpdate(bundle, observedAnswer, { questionId: question.id });
    const predictedAfter = topDomain(bundle.analysis);
    const entropyAfter = bundle.analysis.neighborhood.domainEntropy;
    const truthRetainedAfter = caseRecord.groundTruthDomain
      ? bundle.analysis.neighborhood.frontier.some((theory) => theory.domainId === caseRecord.groundTruthDomain)
      : false;
    steps.push({
      stepIndex: stepIndex + 1,
      questionId: question.id,
      questionPrompt: question.prompt,
      observedAnswer,
      informationGain: question.informationGain,
      predictedDomainBefore: predictedBefore,
      predictedDomainAfter: predictedAfter,
      domainEntropyBefore: entropyBefore,
      domainEntropyAfter: entropyAfter,
      entropyReduction: entropyBefore - entropyAfter,
      truthRetainedAfter: truthRetainedAfter ? 1 : 0,
      finalCorrect:
        caseRecord.groundTruthDomain && predictedAfter === caseRecord.groundTruthDomain ? 1 : 0
    });
  }

  return {
    initialBundle,
    finalBundle: bundle,
    steps
  };
}

export {
  analyzeBenchmarkCase,
  benchmarkDomains,
  buildBenchmarkPrefixSegments,
  buildBenchmarkPrefixText,
  runQuestionBudget,
  topDomain
};
