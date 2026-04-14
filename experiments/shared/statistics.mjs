function createSeededRng(seed = 17) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function mean(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(sortedValues, percentile) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function bootstrapConfidenceInterval(values, metric, { samples = 250, seed = 17 } = {}) {
  if (values.length === 0) {
    return { lower: 0, median: 0, upper: 0 };
  }

  const rng = createSeededRng(seed);
  const metrics = [];

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    const resample = Array.from({ length: values.length }, () => values[Math.floor(rng() * values.length)]);
    metrics.push(metric(resample));
  }

  const sorted = [...metrics].sort((left, right) => left - right);

  return {
    lower: quantile(sorted, 0.025),
    median: quantile(sorted, 0.5),
    upper: quantile(sorted, 0.975)
  };
}

function expectedCalibrationError(predictions, bins = 5) {
  if (predictions.length === 0) {
    return 0;
  }

  const populatedBins = Array.from({ length: bins }, () => []);

  for (const prediction of predictions) {
    const confidence = Math.max(0, Math.min(0.999999, prediction.confidence ?? 0));
    const binIndex = Math.min(bins - 1, Math.floor(confidence * bins));
    populatedBins[binIndex].push(prediction);
  }

  return populatedBins.reduce((total, bucket) => {
    if (bucket.length === 0) {
      return total;
    }

    const confidenceMean = mean(bucket.map((entry) => entry.confidence ?? 0));
    const accuracyMean = mean(bucket.map((entry) => (entry.correct ? 1 : 0)));
    return total + (bucket.length / predictions.length) * Math.abs(confidenceMean - accuracyMean);
  }, 0);
}

function meanDefined(values) {
  const defined = values.filter((value) => Number.isFinite(value));
  return mean(defined);
}

function summarizeClassificationByLabel(
  rows,
  { labels, truthField = 'groundTruthDomain', predictionField = 'predictedDomain', rankField = null } = {}
) {
  return labels.map((label) => {
    const supportRows = rows.filter((row) => row[truthField] === label);
    const predictedRows = rows.filter((row) => row[predictionField] === label);
    const truePositive = supportRows.filter((row) => row[predictionField] === label).length;
    const support = supportRows.length;
    const predicted = predictedRows.length;
    const precision = predicted === 0 ? 0 : truePositive / predicted;
    const recall = support === 0 ? 0 : truePositive / support;
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    return {
      label,
      support,
      predicted,
      precision,
      recall,
      f1,
      meanRank:
        rankField === null
          ? null
          : meanDefined(
              supportRows
                .map((row) => row[rankField])
                .filter((value) => value !== null && value !== undefined)
            )
    };
  });
}

function buildConfusionMatrix(
  rows,
  { labels, truthField = 'groundTruthDomain', predictionField = 'predictedDomain' } = {}
) {
  const matrix = [];

  for (const actual of labels) {
    for (const predicted of labels) {
      matrix.push({
        actual,
        predicted,
        count: rows.filter((row) => row[truthField] === actual && row[predictionField] === predicted).length
      });
    }
  }

  return matrix;
}

export {
  bootstrapConfidenceInterval,
  buildConfusionMatrix,
  createSeededRng,
  expectedCalibrationError,
  mean,
  summarizeClassificationByLabel
};
