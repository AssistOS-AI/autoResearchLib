function groupBy(values, keyFn) {
  return values.reduce((accumulator, value) => {
    const key = keyFn(value);
    const existing = accumulator.get(key) ?? [];
    existing.push(value);
    accumulator.set(key, existing);
    return accumulator;
  }, new Map());
}

function bundleCueGroups(bundle) {
  return [...bundle.analysis.rawCues.explicit, ...bundle.analysis.rawCues.inferred];
}

function buildFamilyIndex(bundle) {
  return bundle.canonicalLines.reduce((accumulator, line) => {
    const family = line.split(' ')[0];
    const existing = accumulator[family] ?? [];
    existing.push(line);
    accumulator[family] = existing;
    return accumulator;
  }, {});
}

function buildEvidenceRibbon(bundle) {
  const cueGroups = groupBy(bundleCueGroups(bundle), (cue) => cue.sources?.[0]?.segmentId ?? 'unscoped');

  return bundle.input.segmentSpans.map((segment) => ({
    id: segment.id,
    span: segment.span,
    text: segment.text,
    cues: (cueGroups.get(segment.id) ?? []).map((cue) => ({
      id: cue.id,
      evidenceType: cue.evidenceType,
      domainId: cue.domainId,
      sources: cue.sources
    }))
  }));
}

function buildCueConstellation(bundle) {
  const grouped = groupBy(bundleCueGroups(bundle), (cue) => cue.domainId ?? 'shared');

  return [...grouped.entries()].map(([domainId, cues]) => ({
    domainId,
    cues: cues.map((cue) => ({
      id: cue.id,
      kind: cue.kind,
      evidenceType: cue.evidenceType,
      segmentIds: cue.sources?.map((source) => source.segmentId).filter(Boolean) ?? [],
      ruleIds: cue.sources?.map((source) => source.ruleId).filter(Boolean) ?? []
    }))
  }));
}

function buildHypothesisLanes(bundle) {
  return bundle.analysis.hypotheses.map((hypothesis) => ({
    id: hypothesis.id,
    focusDomain: hypothesis.focusDomain,
    ambiguityDomains: hypothesis.ambiguities,
    supportByDomain: hypothesis.supportByDomain,
    confidenceProfile: hypothesis.confidenceProfile,
    cueIds: [...hypothesis.explicitCues, ...hypothesis.inferredCues].map((cue) => cue.id)
  }));
}

function buildNeighborhoodAtlas(bundle) {
  return {
    nodes: bundle.analysis.neighborhood.theories.map((theory) => ({
      id: theory.id,
      domainId: theory.domainId,
      variant: theory.variant,
      score: theory.scoreProfile.total,
      onFrontier: bundle.analysis.neighborhood.frontier.some((entry) => entry.id === theory.id)
    })),
    edges: (bundle.analysis.neighborhood.transformations ?? []).map((transformation) => ({
      from: transformation.from,
      to: transformation.to,
      type: transformation.type
    }))
  };
}

function buildFrontierBoard(bundle) {
  const selection = bundle.analysis.neighborhood.frontierSelection ?? {
    rescuedIds: []
  };
  const rescuedIds = new Set(selection.rescuedIds ?? []);

  return {
    frontier: bundle.analysis.neighborhood.frontier.map((theory) => ({
      id: theory.id,
      domainId: theory.domainId,
      variant: theory.variant,
      total: theory.scoreProfile.total,
      rescued: rescuedIds.has(theory.id)
    })),
    domainDistribution: bundle.analysis.neighborhood.domainDistribution,
    equivalenceClasses: bundle.analysis.neighborhood.equivalenceClasses,
    robustInvariants: bundle.analysis.neighborhood.robustInvariants,
    theorySensitiveConsequences: bundle.analysis.neighborhood.theorySensitiveConsequences,
    domainEntropy: bundle.analysis.neighborhood.domainEntropy,
    theoryEntropy: bundle.analysis.neighborhood.theoryEntropy
  };
}

function buildQuestionPartitionView(bundle) {
  const question = bundle.analysis.neighborhood.recommendedQuestion;

  return {
    recommendedQuestion: question
      ? {
          id: question.id,
          prompt: question.prompt,
          answerClasses: question.answerClasses,
          answerPartitions: question.answerPartitions,
          answerMap: question.predictedAnswersByDomain,
          informationGain: question.informationGain
        }
      : null,
    questionUpdate: bundle.analysis.questionUpdate ?? null
  };
}

function buildCategoryLens(bundle) {
  return {
    objects: {
      hypotheses: bundle.analysis.hypotheses.map((hypothesis) => hypothesis.id),
      theories: bundle.analysis.neighborhood.theories.map((theory) => theory.id),
      equivalenceClasses: bundle.analysis.neighborhood.equivalenceClasses.map((entry) => entry.id)
    },
    morphisms: {
      transforms: bundle.analysis.neighborhood.transformations,
      update:
        bundle.analysis.questionUpdate
          ? {
              questionId: bundle.analysis.questionUpdate.questionId,
              observedAnswer: bundle.analysis.questionUpdate.observedAnswer
            }
          : null
    }
  };
}

function buildRulialGraph(runRecord) {
  const bundle = runRecord.bundle;
  const graph = {
    nodes: [],
    edges: []
  };
  const nodeIds = new Set();
  const edgeIds = new Set();
  const cueById = new Map(bundleCueGroups(bundle).map((cue) => [cue.id, cue]));
  const frontierIds = new Set(bundle.analysis.neighborhood.frontier.map((theory) => theory.id));
  const rescuedIds = new Set(bundle.analysis.neighborhood.frontierSelection?.rescuedIds ?? []);
  const domainNodeIds = new Map();

  function addNode(node) {
    if (nodeIds.has(node.id)) {
      return;
    }

    nodeIds.add(node.id);
    graph.nodes.push(node);
  }

  function addEdge(edge) {
    if (edgeIds.has(edge.id)) {
      return;
    }

    edgeIds.add(edge.id);
    graph.edges.push(edge);
  }

  bundle.input.segmentSpans.forEach((segment, index) => {
    addNode({
      id: segment.id,
      type: 'segment',
      stage: 'source',
      group: 'source',
      order: index,
      label: `Segment ${index + 1}`,
      shortLabel: `S${index + 1}`,
      subtitle: segment.span,
      detail: segment.text,
      metrics: {
        cueCount:
          bundleCueGroups(bundle).filter((cue) => cue.sources?.some((source) => source.segmentId === segment.id)).length
      }
    });
  });

  bundleCueGroups(bundle).forEach((cue, index) => {
    const segmentIds = cue.sources?.map((source) => source.segmentId).filter(Boolean) ?? [];
    addNode({
      id: `cue:${cue.id}`,
      type: 'cue',
      stage: 'observation',
      group: cue.domainId ?? 'shared',
      order: index,
      label: cue.id,
      shortLabel: cue.id,
      subtitle: cue.evidenceType,
      detail: cue.sources?.map((source) => source.text ?? source.ruleId ?? source.segmentId).filter(Boolean).join(' | ') ?? '',
      metrics: {
        segmentCount: segmentIds.length,
        inferred: cue.evidenceType === 'inferred'
      },
      refs: {
        segmentIds,
        domainId: cue.domainId ?? null
      }
    });

    segmentIds.forEach((segmentId) => {
      addEdge({
        id: `edge:${segmentId}->cue:${cue.id}`,
        from: segmentId,
        to: `cue:${cue.id}`,
        type: 'evidence',
        stage: 'observation'
      });
    });
  });

  bundle.analysis.hypotheses.forEach((hypothesis, index) => {
    addNode({
      id: `hypothesis:${hypothesis.id}`,
      type: 'hypothesis',
      stage: 'observation',
      group: hypothesis.focusDomain ?? 'shared',
      order: index,
      label: hypothesis.id,
      shortLabel: hypothesis.focusDomain ?? hypothesis.id,
      subtitle: hypothesis.focusDomain ?? 'shared',
      detail: `Ambiguities: ${(hypothesis.ambiguities ?? []).join(', ') || 'none'}`,
      metrics: {
        cueCount: [...hypothesis.explicitCues, ...hypothesis.inferredCues].length,
        ambiguityCount: hypothesis.ambiguities?.length ?? 0
      }
    });

    [...hypothesis.explicitCues, ...hypothesis.inferredCues].forEach((cue) => {
      addEdge({
        id: `edge:cue:${cue.id}->hypothesis:${hypothesis.id}`,
        from: `cue:${cue.id}`,
        to: `hypothesis:${hypothesis.id}`,
        type: 'lift',
        stage: 'observation'
      });
    });
  });

  bundle.analysis.neighborhood.theories.forEach((theory, index) => {
    const hypothesisId = theory.id.split(':')[0];
    addNode({
      id: `theory:${theory.id}`,
      type: theory.variant === 'base' ? 'base-theory' : 'theory',
      stage: theory.variant === 'base' ? 'induction' : 'neighborhood',
      group: theory.domainId,
      order: index,
      label: theory.id,
      shortLabel: `${theory.domainId}:${theory.variant}`,
      subtitle: theory.variant,
      detail: `${theory.domainId} ${theory.variant} theory`,
      metrics: {
        score: theory.scoreProfile.total,
        frontier: frontierIds.has(theory.id),
        rescued: rescuedIds.has(theory.id)
      }
    });

    if (theory.variant === 'base') {
      addEdge({
        id: `edge:hypothesis:${hypothesisId}->theory:${theory.id}`,
        from: `hypothesis:${hypothesisId}`,
        to: `theory:${theory.id}`,
        type: 'induction',
        stage: 'induction'
      });
    }
  });

  (bundle.analysis.neighborhood.transformations ?? []).forEach((transformation, index) => {
    addEdge({
      id: `edge:theory:${transformation.from}->theory:${transformation.to}:${index}`,
      from: `theory:${transformation.from}`,
      to: `theory:${transformation.to}`,
      type: transformation.type,
      stage: 'neighborhood'
    });
  });

  bundle.analysis.neighborhood.domainDistribution.forEach((entry, index) => {
    const nodeId = `domain:${entry.domainId}`;
    domainNodeIds.set(entry.domainId, nodeId);
    addNode({
      id: nodeId,
      type: 'domain',
      stage: 'frontier',
      group: entry.domainId,
      order: index,
      label: entry.domainId,
      shortLabel: entry.domainId,
      subtitle: 'retained mass',
      detail: `${entry.domainId} retained domain mass`,
      metrics: {
        weight: entry.weight
      }
    });
  });

  bundle.analysis.neighborhood.frontier.forEach((theory, index) => {
    addEdge({
      id: `edge:${domainNodeIds.get(theory.domainId)}->theory:${theory.id}:${index}`,
      from: domainNodeIds.get(theory.domainId),
      to: `theory:${theory.id}`,
      type: rescuedIds.has(theory.id) ? 'rescue' : 'retain',
      stage: 'frontier'
    });
  });

  bundle.analysis.neighborhood.equivalenceClasses.forEach((entry, index) => {
    addNode({
      id: `equivalence:${entry.id}`,
      type: 'equivalence',
      stage: 'equivalence',
      group: entry.domains?.[0] ?? 'mixed',
      order: index,
      label: entry.id,
      shortLabel: entry.id,
      subtitle: `${entry.theoryIds.length} theories`,
      detail: entry.signature,
      metrics: {
        theoryCount: entry.theoryIds.length,
        domainCount: entry.domains?.length ?? 0
      }
    });

    entry.theoryIds.forEach((theoryId) => {
      addEdge({
        id: `edge:theory:${theoryId}->equivalence:${entry.id}`,
        from: `theory:${theoryId}`,
        to: `equivalence:${entry.id}`,
        type: 'quotient',
        stage: 'equivalence'
      });
    });
  });

  const question = bundle.analysis.neighborhood.recommendedQuestion;

  if (question) {
    addNode({
      id: `question:${question.id}`,
      type: 'question',
      stage: 'questioning',
      group: 'question',
      order: 0,
      label: question.id,
      shortLabel: question.id,
      subtitle: 'recommended question',
      detail: question.prompt,
      metrics: {
        informationGain: question.informationGain
      }
    });

    question.answerPartitions.forEach((entry, index) => {
      const answerNodeId = `answer:${question.id}:${entry.answer}`;
      addNode({
        id: answerNodeId,
        type: 'answer',
        stage: 'questioning',
        group: entry.answer,
        order: index,
        label: entry.answer,
        shortLabel: entry.answer,
        subtitle: 'answer branch',
        detail: `${entry.answer} partitions ${(entry.domains ?? []).join(', ')}`,
        metrics: {
          weight: entry.weight,
          domainCount: entry.domains?.length ?? 0
        }
      });
      addEdge({
        id: `edge:question:${question.id}->${answerNodeId}`,
        from: `question:${question.id}`,
        to: answerNodeId,
        type: 'partition',
        stage: 'questioning'
      });
      (entry.domains ?? []).forEach((domainId) => {
        const domainNodeId = domainNodeIds.get(domainId);

        if (!domainNodeId) {
          return;
        }

        addEdge({
          id: `edge:${answerNodeId}->${domainNodeId}`,
          from: answerNodeId,
          to: domainNodeId,
          type: 'predict',
          stage: 'questioning'
        });
      });
    });
  }

  if (bundle.analysis.questionUpdate) {
    const update = bundle.analysis.questionUpdate;
    const updateNodeId = `update:${update.questionId}:${update.observedAnswer}`;
    addNode({
      id: updateNodeId,
      type: 'update',
      stage: 'completed',
      group: 'update',
      order: 0,
      label: `${update.questionId}:${update.observedAnswer}`,
      shortLabel: update.observedAnswer,
      subtitle: 'applied update',
      detail: `Entropy ${update.domainEntropyBefore} -> ${update.domainEntropyAfter}`,
      metrics: {
        domainEntropyBefore: update.domainEntropyBefore,
        domainEntropyAfter: update.domainEntropyAfter,
        theoryEntropyBefore: update.theoryEntropyBefore,
        theoryEntropyAfter: update.theoryEntropyAfter
      }
    });
    addEdge({
      id: `edge:question:${update.questionId}->${updateNodeId}`,
      from: `question:${update.questionId}`,
      to: updateNodeId,
      type: 'update',
      stage: 'questioning'
    });

    bundle.analysis.neighborhood.domainDistribution.slice(0, 3).forEach((entry, index) => {
      const domainNodeId = domainNodeIds.get(entry.domainId);

      if (!domainNodeId) {
        return;
      }

      addEdge({
        id: `edge:${updateNodeId}->${domainNodeId}:${index}`,
        from: updateNodeId,
        to: domainNodeId,
        type: 'after-update',
        stage: 'completed'
      });
    });
  }

  if (runRecord.extra?.novelty) {
    addNode({
      id: 'novelty:risk',
      type: 'novelty',
      stage: 'novelty',
      group: 'novelty',
      order: 0,
      label: runRecord.extra.novelty.openSetCandidate ? 'open-set warning' : 'novelty low',
      shortLabel: runRecord.extra.novelty.openSetCandidate ? 'novelty?' : 'stable',
      subtitle: 'novelty overlay',
      detail: 'Novelty risk sits on top of the retained frontier rather than replacing it.',
      metrics: {
        noveltyRisk: runRecord.extra.novelty.uncertaintyScore,
        openSetCandidate: runRecord.extra.novelty.openSetCandidate
      }
    });

    bundle.analysis.neighborhood.domainDistribution.slice(0, 3).forEach((entry, index) => {
      const domainNodeId = domainNodeIds.get(entry.domainId);

      if (!domainNodeId) {
        return;
      }

      addEdge({
        id: `edge:${domainNodeId}->novelty:risk:${index}`,
        from: domainNodeId,
        to: 'novelty:risk',
        type: 'novelty-signal',
        stage: 'novelty'
      });
    });
  }

  if (runRecord.extra?.steps?.length) {
    runRecord.extra.steps.forEach((step) => {
      addNode({
        id: `step:${step.stepIndex}`,
        type: 'step',
        stage: 'questioning',
        group: 'step',
        order: step.stepIndex,
        label: `Step ${step.stepIndex}`,
        shortLabel: `Q${step.stepIndex}`,
        subtitle: step.observedAnswer,
        detail: step.questionPrompt,
        metrics: {
          informationGain: step.informationGain,
          entropyReduction: step.entropyReduction,
          truthRetainedAfter: step.truthRetainedAfter
        }
      });

      addEdge({
        id: `edge:step:${step.stepIndex}->question:${step.questionId}`,
        from: `step:${step.stepIndex}`,
        to: `question:${step.questionId}`,
        type: 'budget-step',
        stage: 'questioning'
      });

      if (step.stepIndex > 1) {
        addEdge({
          id: `edge:step:${step.stepIndex - 1}->step:${step.stepIndex}`,
          from: `step:${step.stepIndex - 1}`,
          to: `step:${step.stepIndex}`,
          type: 'sequence',
          stage: 'questioning'
        });
      }
    });
  }

  return graph;
}

function buildRunViews(runRecord) {
  if (!runRecord.bundle) {
    return {};
  }

  return {
    evidenceRibbon: buildEvidenceRibbon(runRecord.bundle),
    cueConstellation: buildCueConstellation(runRecord.bundle),
    hypothesisLanes: buildHypothesisLanes(runRecord.bundle),
    neighborhoodAtlas: buildNeighborhoodAtlas(runRecord.bundle),
    frontierBoard: buildFrontierBoard(runRecord.bundle),
    questionPartition: buildQuestionPartitionView(runRecord.bundle),
    categoryLens: buildCategoryLens(runRecord.bundle),
    familyIndex: buildFamilyIndex(runRecord.bundle),
    rulialGraph: buildRulialGraph(runRecord)
  };
}

function buildQuickStats(runRecord) {
  const analysis = runRecord.bundle?.analysis ?? {};
  const neighborhood = analysis.neighborhood ?? {};
  const topDomain = neighborhood.domainDistribution?.[0] ?? null;
  const question = neighborhood.recommendedQuestion ?? null;
  const queryBudgetLimit = runRecord.bundle?.run?.queryBudgetLimit ?? null;
  const queryBudgetConsumed = runRecord.bundle?.run?.queryBudgetConsumed ?? null;

  return {
    segmentCount: runRecord.bundle?.input?.segmentSpans?.length ?? 0,
    cueCount:
      (runRecord.bundle?.analysis?.rawCues?.explicit?.length ?? 0) +
      (runRecord.bundle?.analysis?.rawCues?.inferred?.length ?? 0),
    hypothesisCount: analysis.hypotheses?.length ?? 0,
    theoryCount: neighborhood.theories?.length ?? 0,
    frontierWidth: neighborhood.frontier?.length ?? 0,
    equivalenceClassCount: neighborhood.equivalenceClasses?.length ?? 0,
    topDomain: topDomain?.domainId ?? null,
    topDomainWeight: topDomain?.weight ?? null,
    domainEntropy: neighborhood.domainEntropy ?? null,
    theoryEntropy: neighborhood.theoryEntropy ?? null,
    recommendedQuestionId: question?.id ?? null,
    recommendedQuestionPrompt: question?.prompt ?? null,
    queryBudgetLimit,
    queryBudgetConsumed,
    queryBudgetRemaining:
      queryBudgetLimit === null || queryBudgetConsumed === null ? null : Math.max(queryBudgetLimit - queryBudgetConsumed, 0),
    questionBudgetExhausted:
      queryBudgetLimit === null || queryBudgetConsumed === null ? false : queryBudgetConsumed >= queryBudgetLimit,
    canonicalLineCount: runRecord.bundle?.canonicalLines?.length ?? 0,
    groundTruthDomain: runRecord.bundle?.input?.metadata?.groundTruthDomain ?? null
  };
}

function buildRunSummary(runRecord) {
  return {
    runId: runRecord.id,
    experimentId: runRecord.experimentId,
    title: runRecord.title,
    description: runRecord.description ?? '',
    exampleId: runRecord.exampleId ?? null,
    example: runRecord.example ?? null,
    help: runRecord.help ?? null,
    heroView: runRecord.heroView,
    scenario: runRecord.scenario,
    parentRunId: runRecord.parentRunId ?? null,
    branchTransition: runRecord.branchTransition ?? null,
    createdAt: runRecord.createdAt,
    canBranch: Boolean(runRecord.canBranch),
    quickStats: buildQuickStats(runRecord),
    traceEventCount: runRecord.trace?.rawEvents?.length ?? 0,
    snapshotCount: runRecord.trace?.snapshots?.length ?? 0,
    availableViews: Object.keys(runRecord.views ?? {}),
    currentSnapshot: runRecord.trace?.snapshots?.[runRecord.trace.snapshots.length - 1] ?? null
  };
}

function buildRunResponse(runRecord) {
  return {
    ...buildRunSummary(runRecord),
    aggregateSummary: runRecord.aggregateSummary ?? null,
    artifactLinks: runRecord.artifactLinks ?? [],
    notes: runRecord.notes ?? [],
    extra: runRecord.extra ?? {},
    views: runRecord.views
  };
}

export { buildRunResponse, buildRunSummary, buildRunViews };
