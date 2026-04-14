import {
  clamp,
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
  const weightedTheories = normalizeWeights(theories, (theory) => theory.scoreProfile.total ?? 0);
  const groups = new Map();

  for (const { item, weight } of weightedTheories) {
    const answer = question.answerMap[item.domainId] ?? 'unknown';
    const existing = groups.get(answer) ?? [];

    existing.push({
      theory: item,
      weight
    });
    groups.set(answer, existing);
  }

  let expectedEntropy = 0;
  const predictedAnswersByTheory = {};

  for (const [answer, members] of groups.entries()) {
    const answerWeight = members.reduce((sum, member) => sum + member.weight, 0);
    const normalizedMembers = members.map((member) => member.weight / answerWeight);

    for (const member of members) {
      predictedAnswersByTheory[member.theory.id] = answer;
    }

    expectedEntropy += answerWeight * computeEntropy(normalizedMembers);
  }

  return {
    expectedEntropy,
    predictedAnswersByTheory,
    answerClasses: [...groups.keys()]
  };
}

function suggestDiscriminatingQuestion(theories, domains) {
  if (theories.length === 0) {
    return null;
  }

  const activeDomains = new Set(theories.map((theory) => theory.domainId));

  if (activeDomains.size <= 1) {
    return null;
  }

  const priorEntropy = computeEntropy(
    normalizeWeights(theories, (theory) => theory.scoreProfile.total ?? 0).map(({ weight }) => weight)
  );
  const scored = uniqueQuestions(domains).map((question) => {
    const { expectedEntropy, predictedAnswersByTheory, answerClasses } = partitionEntropy(theories, question);
    const informationGain = clamp(priorEntropy - expectedEntropy, 0, priorEntropy);

    return {
      ...question,
      priorEntropy,
      expectedEntropy,
      informationGain,
      predictedAnswersByTheory,
      answerClasses
    };
  });

  const best = scored.sort((left, right) => {
    const informationGainDelta = right.informationGain - left.informationGain;

    if (informationGainDelta !== 0) {
      return informationGainDelta;
    }

    return left.id.localeCompare(right.id);
  })[0];

  return best.informationGain > 0.0001 ? best : null;
}

function applyQuestionAnswer(theories, question, observedAnswer, limit = 8) {
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
      scoreProfile: withComputedTotal({
        evidenceCoverage: clamp(theory.scoreProfile.evidenceCoverage + (deltas.evidenceCoverage ?? 0)),
        predictiveAdequacy: clamp(theory.scoreProfile.predictiveAdequacy + (deltas.predictiveAdequacy ?? 0)),
        compressionUtility: clamp(theory.scoreProfile.compressionUtility + (deltas.compressionUtility ?? 0)),
        compositionalSharpness: clamp(theory.scoreProfile.compositionalSharpness + (deltas.compositionalSharpness ?? 0)),
        stability: clamp(theory.scoreProfile.stability + (deltas.stability ?? 0)),
        alignmentUtility: clamp(theory.scoreProfile.alignmentUtility + (deltas.alignmentUtility ?? 0))
      }),
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

export { applyQuestionAnswer, suggestDiscriminatingQuestion };
