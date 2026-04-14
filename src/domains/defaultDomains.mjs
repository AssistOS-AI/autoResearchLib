const sharedCueLexicon = [
  {
    id: 'registered',
    label: 'registration or logging',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.14,
    phrases: ['registered', 'logged', 'recorded', 'entered in the system'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'queued',
    label: 'queued or staged',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.1,
    phrases: ['queue', 'staging area', 'tray'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'label',
    label: 'identifier attached',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.14,
    phrases: ['label', 'tag', 'identifier'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'record-update',
    label: 'record updated',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.12,
    phrases: ['record was updated', 'updated the record', 'status updated', 'manifest was updated'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'handoff',
    label: 'handoff or forwarding',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.12,
    phrases: ['sent', 'forwarded', 'handed off', 'moved on'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'confirmed',
    label: 'confirmation',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.1,
    phrases: ['confirmed', 'validated', 'acknowledged'],
    visibleTo: ['coarse', 'rich']
  },
  {
    id: 'stored',
    label: 'stored or archived',
    kind: 'workflow',
    specificity: 'generic',
    weight: 0.1,
    phrases: ['stored', 'archived'],
    visibleTo: ['coarse', 'rich']
  }
];

const domainBundles = [
  {
    id: 'package',
    label: 'Package handling',
    lexicalSummary:
      'A logistics workflow in which a labeled item is routed, dispatched, and delivered to a recipient.',
    cueLexicon: [
      {
        id: 'routing-label',
        label: 'routing label',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['routing label', 'routing tag'],
        visibleTo: ['rich']
      },
      {
        id: 'tracking-code',
        label: 'tracking code',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['tracking code', 'barcode', 'tracking number', 'pickup manifest'],
        visibleTo: ['rich']
      },
      {
        id: 'courier-scan',
        label: 'courier scan',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['courier scanned', 'driver scanned', 'courier', 'driver'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'dispatch',
        label: 'dispatch',
        kind: 'event',
        specificity: 'domain',
        weight: 0.26,
        phrases: ['dispatch', 'dispatched', 'depot'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'delivery',
        label: 'delivery',
        kind: 'event',
        specificity: 'domain',
        weight: 0.3,
        phrases: ['delivery', 'delivered', 'recipient', 'destination'],
        visibleTo: ['coarse', 'rich']
      }
    ],
    inferenceRules: [
      {
        id: 'package-flow',
        inferredCue: {
          id: 'package-flow',
          label: 'delivery flow inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['tracking-code', 'courier-scan', 'dispatch', 'delivery']
      }
    ],
    stateSequence: ['registered', 'labeled', 'dispatched', 'delivered'],
    stateAnchors: {
      registered: ['registered'],
      labeled: ['label', 'routing-label', 'tracking-code'],
      dispatched: ['courier-scan', 'dispatch', 'package-flow'],
      delivered: ['delivery', 'confirmed']
    },
    stateSchema: {
      roles: ['artifact', 'sender', 'recipient', 'carrier'],
      states: ['registered', 'labeled', 'dispatched', 'in_transit', 'delivered']
    },
    invariants: [
      'artifact identity is preserved across the workflow',
      'status transitions follow logged handoffs',
      'dispatch precedes delivery',
      'recipient-facing completion terminates the local flow'
    ],
    rewriteTemplates: [
      'register -> label',
      'label -> dispatch',
      'dispatch -> deliver'
    ],
    compositionRules: [
      'handoff events must keep the same artifact identifier',
      'delivery may only follow a dispatch-capable state'
    ],
    questions: [
      {
        id: 'package-dispatch',
        prompt: 'Is there evidence that it was dispatched to a recipient or destination?',
        cue: 'dispatch',
        answerMap: {
          package: 'yes',
          sample: 'no',
          manuscript: 'no'
        }
      },
      {
        id: 'package-tracking',
        prompt: 'Is a courier, tracking code, or barcode mentioned?',
        cue: 'tracking-code',
        answerMap: {
          package: 'yes',
          sample: 'no',
          manuscript: 'no'
        }
      }
    ]
  },
  {
    id: 'sample',
    label: 'Laboratory sample handling',
    lexicalSummary:
      'A laboratory workflow in which a labeled specimen is stored under constraints, assayed, and archived.',
    cueLexicon: [
      {
        id: 'vial-label',
        label: 'vial or specimen label',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['vial label', 'specimen identifier', 'sample id'],
        visibleTo: ['rich']
      },
      {
        id: 'cold-storage',
        label: 'cold storage',
        kind: 'state',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['cold room', 'freezer', 'cold storage'],
        visibleTo: ['rich']
      },
      {
        id: 'temperature-log',
        label: 'temperature log',
        kind: 'event',
        specificity: 'domain',
        weight: 0.26,
        phrases: ['temperature', 'temperature log', 'temperature was logged'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'assay',
        label: 'assay or analysis',
        kind: 'event',
        specificity: 'domain',
        weight: 0.28,
        phrases: ['assay', 'analysis', 'aliquot', 'centrifuge'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'biobank',
        label: 'biobank archive',
        kind: 'state',
        specificity: 'domain',
        weight: 0.22,
        phrases: ['biobank', 'specimen archive', 'sample archive'],
        visibleTo: ['rich']
      }
    ],
    inferenceRules: [
      {
        id: 'sample-chain',
        inferredCue: {
          id: 'sample-chain',
          label: 'controlled sample chain inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['vial-label', 'cold-storage', 'temperature-log', 'assay']
      }
    ],
    stateSequence: ['registered', 'labeled', 'stored', 'assayed', 'archived'],
    stateAnchors: {
      registered: ['registered'],
      labeled: ['label', 'vial-label'],
      stored: ['cold-storage', 'temperature-log', 'stored'],
      assayed: ['assay', 'sample-chain'],
      archived: ['biobank', 'stored', 'archived']
    },
    stateSchema: {
      roles: ['specimen', 'technician', 'lab', 'storage'],
      states: ['registered', 'labeled', 'stored', 'assayed', 'archived']
    },
    invariants: [
      'artifact identity is preserved across the workflow',
      'status transitions follow logged handoffs',
      'storage constraints must hold before assay',
      'analysis consumes a tracked specimen state'
    ],
    rewriteTemplates: [
      'register -> label',
      'label -> store',
      'store -> assay',
      'assay -> archive'
    ],
    compositionRules: [
      'sample handling must preserve traceability between label and assay',
      'storage and assay states may not be conflated without losing explanatory value'
    ],
    questions: [
      {
        id: 'sample-temperature',
        prompt: 'Is there evidence of temperature control or cold storage?',
        cue: 'temperature-log',
        answerMap: {
          package: 'no',
          sample: 'yes',
          manuscript: 'no'
        }
      },
      {
        id: 'sample-assay',
        prompt: 'Was the item prepared for assay or analysis?',
        cue: 'assay',
        answerMap: {
          package: 'no',
          sample: 'yes',
          manuscript: 'no'
        }
      }
    ]
  },
  {
    id: 'manuscript',
    label: 'Editorial manuscript workflow',
    lexicalSummary:
      'An editorial workflow in which a submission enters review, receives revision, and eventually reaches a decision.',
    cueLexicon: [
      {
        id: 'submission-record',
        label: 'submission record',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['submission record', 'manuscript id', 'editorial queue'],
        visibleTo: ['rich']
      },
      {
        id: 'editor',
        label: 'editor',
        kind: 'role',
        specificity: 'domain',
        weight: 0.22,
        phrases: ['editor', 'associate editor'],
        visibleTo: ['rich']
      },
      {
        id: 'review',
        label: 'review',
        kind: 'event',
        specificity: 'domain',
        weight: 0.26,
        phrases: ['reviewers', 'peer review', 'review'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'revision',
        label: 'revision',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['revised', 'revision', 'revise'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'acceptance',
        label: 'acceptance decision',
        kind: 'event',
        specificity: 'domain',
        weight: 0.3,
        phrases: ['accepted', 'decision letter', 'journal accepted'],
        visibleTo: ['coarse', 'rich']
      }
    ],
    inferenceRules: [
      {
        id: 'editorial-flow',
        inferredCue: {
          id: 'editorial-flow',
          label: 'editorial cycle inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['submission-record', 'editor', 'review', 'revision', 'acceptance']
      }
    ],
    stateSequence: ['registered', 'submitted', 'reviewed', 'revised', 'accepted'],
    stateAnchors: {
      registered: ['registered'],
      submitted: ['label', 'submission-record'],
      reviewed: ['review', 'editorial-flow', 'editor'],
      revised: ['revision'],
      accepted: ['acceptance', 'confirmed']
    },
    stateSchema: {
      roles: ['manuscript', 'author', 'editor', 'reviewer'],
      states: ['registered', 'submitted', 'reviewed', 'revised', 'accepted']
    },
    invariants: [
      'artifact identity is preserved across the workflow',
      'status transitions follow logged handoffs',
      'review precedes editorial revision',
      'acceptance only follows a complete decision path'
    ],
    rewriteTemplates: [
      'register -> submit',
      'submit -> review',
      'review -> revise',
      'revise -> accept'
    ],
    compositionRules: [
      'editorial roles mediate review-to-revision transitions',
      'decision states must preserve the submission identity'
    ],
    questions: [
      {
        id: 'manuscript-review',
        prompt: 'Is there evidence that reviewers or an editor handled it?',
        cue: 'review',
        answerMap: {
          package: 'no',
          sample: 'no',
          manuscript: 'yes'
        }
      },
      {
        id: 'manuscript-revision',
        prompt: 'Was a revision or acceptance decision mentioned?',
        cue: 'revision',
        answerMap: {
          package: 'no',
          sample: 'no',
          manuscript: 'yes'
        }
      }
    ]
  }
];

const observerProfiles = {
  coarse: {
    id: 'coarse',
    label: 'Coarse observer',
    description: 'Tracks generic workflow signal and only strongly procedural domain markers.'
  },
  rich: {
    id: 'rich',
    label: 'Rich observer',
    description: 'Tracks generic workflow signal plus subtle domain markers and richer provenance.'
  }
};

function sumWeights(items) {
  return items.reduce((total, item) => total + item.weight, 0);
}

function withMetadata(bundle) {
  return {
    ...bundle,
    maxDomainSignal: sumWeights(bundle.cueLexicon),
    maxInferredSignal: sumWeights(bundle.inferenceRules.map((rule) => rule.inferredCue))
  };
}

const defaultDomains = domainBundles.map(withMetadata);
const maxGenericSignal = sumWeights(sharedCueLexicon);

function getObserverProfile(id = 'coarse') {
  return observerProfiles[id] ?? observerProfiles.coarse;
}

function getDomainById(domainId) {
  return defaultDomains.find((domain) => domain.id === domainId) ?? null;
}

export {
  defaultDomains,
  getDomainById,
  getObserverProfile,
  maxGenericSignal,
  observerProfiles,
  sharedCueLexicon
};
