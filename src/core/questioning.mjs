import { DEFAULT_SCORE_WEIGHTS } from '../config/analysisPolicy.mjs';
import {
  clamp,
  computeDomainDistribution,
  computeEntropy,
  normalizeWeights,
  retainNonDominated,
  withComputedTotal
} from './frontier.mjs';

function uniqueQuestions(domains) {
  const seen = new Set();
  const questions = [];

  for (const domain of domains) {
    for (const question of domain.questions) {
      if (seen.has(question.id)) {
        continue;
      }

      seen.add(question.id);
      questions.push(question);
    }
  }

  return questions;
}

function partitionEntropy(theories, question) {
  const weightedDomains = computeDomainDistribution(theories);
  const groups = new Map();

  for (const entry of weightedDomains) {
    const answer = question.answerMap[entry.domainId] ?? 'unknown';
    const existing = groups.get(answer) ?? [];

    existing.push({
      domainId: entry.domainId,
      weight: entry.weight
    });
    groups.set(answer, existing);
  }

  let expectedEntropy = 0;
  const predictedAnswersByDomain = {};
  const predictedAnswersByTheory = {};
  const answerPartitions = [];

  for (const theory of theories) {
    predictedAnswersByTheory[theory.id] = question.answerMap[theory.domainId] ?? 'unknown';
  }

  for (const [answer, members] of groups.entries()) {
    const answerWeight = members.reduce((sum, member) => sum + member.weight, 0);
    const normalizedMembers = members.map((member) => member.weight / answerWeight);

    for (const member of members) {
      predictedAnswersByDomain[member.domainId] = answer;
    }

    expectedEntropy += answerWeight * computeEntropy(normalizedMembers);
    answerPartitions.push({
      answer,
      weight: answerWeight,
      domains: members.map((member) => member.domainId).sort()
    });
  }

  return {
    expectedEntropy,
    predictedAnswersByDomain,
    predictedAnswersByTheory,
    answerClasses: [...groups.keys()],
    answerPartitions: answerPartitions.sort((left, right) => left.answer.localeCompare(right.answer))
  };
}

function scoreDiscriminatingQuestions(theories, domains, policy) {
  if (policy?.features?.questions === false) {
    return [];
  }

  if (theories.length === 0) {
    return [];
  }

  const activeDomains = new Set(theories.map((theory) => theory.domainId));

  if (activeDomains.size <= 1) {
    return [];
  }

  const priorEntropy = computeEntropy(computeDomainDistribution(theories).map((entry) => entry.weight));
  const scored = uniqueQuestions(domains).map((question) => {
    const {
      expectedEntropy,
      predictedAnswersByDomain,
      predictedAnswersByTheory,
      answerClasses,
      answerPartitions
    } = partitionEntropy(theories, question);
    const informationGain = clamp(priorEntropy - expectedEntropy, 0, priorEntropy);

    return {
      ...question,
      priorEntropy,
      expectedEntropy,
      informationGain,
      predictedAnswersByDomain,
      predictedAnswersByTheory,
      answerClasses,
      answerPartitions
    };
  });

  return scored.sort((left, right) => {
    const informationGainDelta = right.informationGain - left.informationGain;

    if (informationGainDelta !== 0) {
      return informationGainDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

function suggestDiscriminatingQuestion(theories, domains, policy) {
  const best = scoreDiscriminatingQuestions(theories, domains, policy)[0];
  return best && best.informationGain > 0.0001 ? best : null;
}

function applyQuestionAnswer(theories, question, observedAnswer, limit = 8, policy) {
  const scoreWeights = policy?.scoreWeights ?? DEFAULT_SCORE_WEIGHTS;
  const updated = theories.map((theory) => {
    const predictedAnswer = question.answerMap[theory.domainId] ?? 'unknown';
    let deltas;

    if (predictedAnswer === observedAnswer) {
      deltas = {
        evidenceCoverage: observedAnswer === 'yes' ? 0.06 : 0.02,
        predictiveAdequacy: 0.16,
        stability: 0.06,
        alignmentUtility: 0.08
      };
    } else if (predictedAnswer === 'unknown') {
      deltas = {
        predictiveAdequacy: -0.03,
        stability: -0.02,
        alignmentUtility: -0.02
      };
    } else {
      deltas = {
        evidenceCoverage: -0.04,
        predictiveAdequacy: -0.2,
        compositionalSharpness: -0.05,
        stability: -0.08,
        alignmentUtility: -0.12
      };
    }

    return {
      ...theory,
      scoreProfile: withComputedTotal(
        {
          evidenceCoverage: clamp(theory.scoreProfile.evidenceCoverage + (deltas.evidenceCoverage ?? 0)),
          predictiveAdequacy: clamp(theory.scoreProfile.predictiveAdequacy + (deltas.predictiveAdequacy ?? 0)),
          compressionUtility: clamp(theory.scoreProfile.compressionUtility + (deltas.compressionUtility ?? 0)),
          compositionalSharpness: clamp(theory.scoreProfile.compositionalSharpness + (deltas.compositionalSharpness ?? 0)),
          stability: clamp(theory.scoreProfile.stability + (deltas.stability ?? 0)),
          alignmentUtility: clamp(theory.scoreProfile.alignmentUtility + (deltas.alignmentUtility ?? 0))
        },
        scoreWeights
      ),
      questionTrace: [
        ...(theory.questionTrace ?? []),
        {
          questionId: question.id,
          observedAnswer,
          predictedAnswer
        }
      ]
    };
  });

  return {
    theories: updated,
    frontier: retainNonDominated(updated, limit)
  };
}

export { applyQuestionAnswer, scoreDiscriminatingQuestions, suggestDiscriminatingQuestion };
