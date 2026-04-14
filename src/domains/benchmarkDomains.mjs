import { defaultDomains } from './defaultDomains.mjs';

const additionalDomainBundles = [
  {
    id: 'procurement',
    label: 'Procurement approval workflow',
    lexicalSummary:
      'A procurement workflow in which a request is approved, invoiced, and paid through a vendor-facing process.',
    cueLexicon: [
      {
        id: 'purchase-request',
        label: 'purchase request',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['purchase request', 'order request', 'requisition'],
        visibleTo: ['rich']
      },
      {
        id: 'vendor-quote',
        label: 'vendor quote',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.22,
        phrases: ['vendor quote', 'supplier quote', 'quotation'],
        visibleTo: ['rich']
      },
      {
        id: 'approval',
        label: 'approval',
        kind: 'event',
        specificity: 'domain',
        weight: 0.26,
        phrases: ['approved', 'approval', 'manager approval'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'invoice',
        label: 'invoice',
        kind: 'event',
        specificity: 'domain',
        weight: 0.28,
        phrases: ['invoice', 'invoiced', 'billing'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'payment-order',
        label: 'payment order',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['payment order', 'payment', 'paid'],
        visibleTo: ['rich']
      }
    ],
    inferenceRules: [
      {
        id: 'procurement-cycle',
        inferredCue: {
          id: 'procurement-cycle',
          label: 'procurement cycle inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['purchase-request', 'vendor-quote', 'approval', 'invoice']
      }
    ],
    stateSequence: ['registered', 'requested', 'approved', 'invoiced', 'paid'],
    stateAnchors: {
      registered: ['registered'],
      requested: ['label', 'purchase-request', 'vendor-quote'],
      approved: ['approval', 'procurement-cycle'],
      invoiced: ['invoice'],
      paid: ['payment-order', 'confirmed']
    },
    stateSchema: {
      roles: ['request', 'manager', 'vendor', 'finance'],
      states: ['registered', 'requested', 'approved', 'invoiced', 'paid']
    },
    invariants: [
      'request identity is preserved across approval and payment',
      'approval precedes invoicing',
      'vendor billing must remain tied to an approved request',
      'payment closes the local procurement flow'
    ],
    rewriteTemplates: [
      'register -> request',
      'request -> approve',
      'approve -> invoice',
      'invoice -> pay'
    ],
    compositionRules: [
      'approval and billing must reference the same request',
      'payment may only follow an invoiced state'
    ],
    questions: [
      {
        id: 'procurement-approval',
        prompt: 'Is there evidence of managerial approval or sign-off before fulfillment?',
        cue: 'approval',
        answerMap: {
          procurement: 'yes'
        }
      },
      {
        id: 'procurement-invoice',
        prompt: 'Is an invoice, quotation, or payment order mentioned?',
        cue: 'invoice',
        answerMap: {
          procurement: 'yes'
        }
      }
    ]
  },
  {
    id: 'maintenance',
    label: 'Maintenance work-order workflow',
    lexicalSummary:
      'A maintenance workflow in which a service ticket is inspected, repaired, verified, and closed.',
    cueLexicon: [
      {
        id: 'service-ticket',
        label: 'service ticket',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['service ticket', 'work order', 'maintenance ticket'],
        visibleTo: ['rich']
      },
      {
        id: 'inspection',
        label: 'inspection',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['inspection', 'inspected', 'diagnostic check'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'technician',
        label: 'technician handling',
        kind: 'role',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['technician', 'service engineer'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'repair',
        label: 'repair',
        kind: 'event',
        specificity: 'domain',
        weight: 0.3,
        phrases: ['repair', 'repaired', 'replacement part'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'work-order-close',
        label: 'work order closed',
        kind: 'event',
        specificity: 'domain',
        weight: 0.22,
        phrases: ['work order closed', 'service closed', 'closure note'],
        visibleTo: ['rich']
      }
    ],
    inferenceRules: [
      {
        id: 'maintenance-cycle',
        inferredCue: {
          id: 'maintenance-cycle',
          label: 'maintenance cycle inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['service-ticket', 'inspection', 'technician', 'repair']
      }
    ],
    stateSequence: ['registered', 'inspected', 'repaired', 'verified', 'closed'],
    stateAnchors: {
      registered: ['registered'],
      inspected: ['inspection', 'technician'],
      repaired: ['repair', 'maintenance-cycle'],
      verified: ['confirmed'],
      closed: ['work-order-close', 'confirmed']
    },
    stateSchema: {
      roles: ['asset', 'technician', 'requester', 'service-team'],
      states: ['registered', 'inspected', 'repaired', 'verified', 'closed']
    },
    invariants: [
      'asset identity is preserved across the work order',
      'inspection precedes repair',
      'repair verification must reference the same ticket',
      'closure follows a completed service action'
    ],
    rewriteTemplates: [
      'register -> inspect',
      'inspect -> repair',
      'repair -> verify',
      'verify -> close'
    ],
    compositionRules: [
      'service actions must stay attached to one work order',
      'repair closure may only follow a verified intervention'
    ],
    questions: [
      {
        id: 'maintenance-repair',
        prompt: 'Is there evidence of repair work or replacement of a faulty part?',
        cue: 'repair',
        answerMap: {
          maintenance: 'yes'
        }
      },
      {
        id: 'maintenance-technician',
        prompt: 'Did a technician or service engineer inspect or handle it?',
        cue: 'technician',
        answerMap: {
          maintenance: 'yes'
        }
      }
    ]
  },
  {
    id: 'incident',
    label: 'Incident response workflow',
    lexicalSummary:
      'An incident workflow in which an alert is triaged, contained, analyzed, and formally closed.',
    cueLexicon: [
      {
        id: 'alert-record',
        label: 'alert record',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['alert record', 'incident record', 'alert id'],
        visibleTo: ['rich']
      },
      {
        id: 'triage',
        label: 'triage',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['triage', 'triaged', 'severity review'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'containment',
        label: 'containment',
        kind: 'event',
        specificity: 'domain',
        weight: 0.28,
        phrases: ['containment', 'contained', 'isolated'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'root-cause',
        label: 'root cause analysis',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['root cause', 'cause analysis', 'forensic review'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'postmortem',
        label: 'postmortem review',
        kind: 'event',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['postmortem', 'incident review', 'retrospective'],
        visibleTo: ['rich']
      }
    ],
    inferenceRules: [
      {
        id: 'incident-cycle',
        inferredCue: {
          id: 'incident-cycle',
          label: 'incident response cycle inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['alert-record', 'triage', 'containment', 'root-cause']
      }
    ],
    stateSequence: ['registered', 'triaged', 'contained', 'analyzed', 'closed'],
    stateAnchors: {
      registered: ['registered', 'alert-record'],
      triaged: ['triage'],
      contained: ['containment', 'incident-cycle'],
      analyzed: ['root-cause'],
      closed: ['postmortem', 'confirmed']
    },
    stateSchema: {
      roles: ['incident', 'analyst', 'system', 'responder'],
      states: ['registered', 'triaged', 'contained', 'analyzed', 'closed']
    },
    invariants: [
      'incident identity is preserved across triage and closure',
      'containment precedes final closure',
      'root cause analysis follows a tracked incident state',
      'formal closure requires an incident review outcome'
    ],
    rewriteTemplates: [
      'register -> triage',
      'triage -> contain',
      'contain -> analyze',
      'analyze -> close'
    ],
    compositionRules: [
      'containment and analysis must refer to the same incident',
      'closure must preserve incident traceability'
    ],
    questions: [
      {
        id: 'incident-containment',
        prompt: 'Is there evidence that the alert or incident was contained or isolated?',
        cue: 'containment',
        answerMap: {
          incident: 'yes'
        }
      },
      {
        id: 'incident-root-cause',
        prompt: 'Was a root cause analysis or forensic review mentioned?',
        cue: 'root-cause',
        answerMap: {
          incident: 'yes'
        }
      }
    ]
  },
  {
    id: 'compliance',
    label: 'Compliance review workflow',
    lexicalSummary:
      'A compliance workflow in which a record is checked against policy, exceptions are reviewed, and sign-off is archived.',
    cueLexicon: [
      {
        id: 'compliance-record',
        label: 'compliance record',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.2,
        phrases: ['compliance record', 'control record', 'policy file'],
        visibleTo: ['rich']
      },
      {
        id: 'policy-check',
        label: 'policy check',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['policy check', 'control check', 'review against policy'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'exception',
        label: 'exception request',
        kind: 'event',
        specificity: 'domain',
        weight: 0.24,
        phrases: ['exception request', 'policy exception', 'waiver'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'signoff',
        label: 'sign-off',
        kind: 'event',
        specificity: 'domain',
        weight: 0.28,
        phrases: ['sign-off', 'signed off', 'control owner approval'],
        visibleTo: ['coarse', 'rich']
      },
      {
        id: 'audit-log',
        label: 'audit log',
        kind: 'artifact',
        specificity: 'domain',
        weight: 0.18,
        phrases: ['audit log', 'attestation archive', 'control archive'],
        visibleTo: ['rich']
      }
    ],
    inferenceRules: [
      {
        id: 'compliance-cycle',
        inferredCue: {
          id: 'compliance-cycle',
          label: 'compliance review cycle inferred',
          kind: 'inferred-event',
          specificity: 'domain',
          weight: 0.16,
          visibleTo: ['coarse', 'rich']
        },
        requiresAny: ['compliance-record', 'policy-check', 'exception', 'signoff']
      }
    ],
    stateSequence: ['registered', 'reviewed', 'exceptioned', 'approved', 'archived'],
    stateAnchors: {
      registered: ['registered', 'compliance-record'],
      reviewed: ['policy-check'],
      exceptioned: ['exception'],
      approved: ['signoff', 'compliance-cycle'],
      archived: ['audit-log', 'stored']
    },
    stateSchema: {
      roles: ['record', 'reviewer', 'control-owner', 'archive'],
      states: ['registered', 'reviewed', 'exceptioned', 'approved', 'archived']
    },
    invariants: [
      'record identity is preserved across review and sign-off',
      'policy review precedes final approval',
      'exceptions remain attached to the reviewed record',
      'approved compliance records are archived for audit'
    ],
    rewriteTemplates: [
      'register -> review',
      'review -> exception',
      'exception -> approve',
      'approve -> archive'
    ],
    compositionRules: [
      'policy review and sign-off must reference the same control record',
      'archival states keep the sign-off provenance intact'
    ],
    questions: [
      {
        id: 'compliance-exception',
        prompt: 'Is there evidence of an exception request or waiver?',
        cue: 'exception',
        answerMap: {
          compliance: 'yes'
        }
      },
      {
        id: 'compliance-signoff',
        prompt: 'Was the record signed off or approved by a control owner?',
        cue: 'signoff',
        answerMap: {
          compliance: 'yes'
        }
      }
    ]
  }
];

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

function normalizeQuestionMaps(domains) {
  const domainIds = domains.map((domain) => domain.id);

  return domains.map((domain) => ({
    ...domain,
    questions: domain.questions.map((question) => ({
      ...question,
      answerMap: Object.fromEntries(
        domainIds.map((domainId) => [domainId, question.answerMap[domainId] ?? (domainId === domain.id ? 'yes' : 'no')])
      )
    }))
  }));
}

const benchmarkDomains = normalizeQuestionMaps([
  ...defaultDomains.map((domain) => ({
    ...domain,
    questions: domain.questions.map((question) => ({
      ...question,
      answerMap: { ...question.answerMap }
    }))
  })),
  ...additionalDomainBundles.map(withMetadata)
]);

export { benchmarkDomains };
