import { readFile } from 'node:fs/promises';
import { benchmarkDomains } from '../../src/domains/benchmarkDomains.mjs';

const coreCasesPath = new URL('../../data/inputs/workflow-cases.json', import.meta.url);

const additionalBaseCases = [
  {
    id: 'procurement-request',
    groundTruthDomain: 'procurement',
    segments: [
      'The item was registered and placed in the queue.',
      'A purchase request was attached and the record was updated.',
      'Manager approval cleared it for vendor billing.',
      'Finance logged the invoice before payment.'
    ],
    answers: {
      'procurement-approval': 'yes',
      'procurement-invoice': 'yes'
    }
  },
  {
    id: 'procurement-quotation',
    groundTruthDomain: 'procurement',
    segments: [
      'The request was recorded and placed in the staging area.',
      'A supplier quote was attached and the status was updated.',
      'Approval arrived before the order moved to billing.',
      'The payment order closed the request.'
    ],
    answers: {
      'procurement-approval': 'yes',
      'procurement-invoice': 'yes'
    }
  },
  {
    id: 'procurement-generic',
    groundTruthDomain: 'procurement',
    segments: [
      'The request was entered in the system and placed in the tray.',
      'A requisition file was attached and the manifest was updated.',
      'The control owner approved it for invoicing.',
      'Vendor billing was paid after review.'
    ],
    answers: {
      'procurement-approval': 'yes',
      'procurement-invoice': 'yes'
    }
  },
  {
    id: 'procurement-payment-order',
    groundTruthDomain: 'procurement',
    segments: [
      'The item was logged and placed in the queue.',
      'An order request and quotation were attached.',
      'Manager approval released it to finance.',
      'The payment order and invoice were both recorded.'
    ],
    answers: {
      'procurement-approval': 'yes',
      'procurement-invoice': 'yes'
    }
  },
  {
    id: 'maintenance-ticket',
    groundTruthDomain: 'maintenance',
    segments: [
      'The item was registered and placed in the queue.',
      'A service ticket was attached and the record was updated.',
      'A technician completed the inspection before repair.',
      'The work order closed after verification.'
    ],
    answers: {
      'maintenance-repair': 'yes',
      'maintenance-technician': 'yes'
    }
  },
  {
    id: 'maintenance-repair',
    groundTruthDomain: 'maintenance',
    segments: [
      'The asset was recorded and placed in the staging area.',
      'A maintenance ticket was attached and the status was updated.',
      'A service engineer replaced the faulty part during repair.',
      'The closure note confirmed the work order.'
    ],
    answers: {
      'maintenance-repair': 'yes',
      'maintenance-technician': 'yes'
    }
  },
  {
    id: 'maintenance-generic',
    groundTruthDomain: 'maintenance',
    segments: [
      'The request was entered in the system and placed in the tray.',
      'A work order was attached and the record was updated.',
      'The inspection identified the fault before repair.',
      'Service closure was validated at the end.'
    ],
    answers: {
      'maintenance-repair': 'yes',
      'maintenance-technician': 'yes'
    }
  },
  {
    id: 'maintenance-diagnostic',
    groundTruthDomain: 'maintenance',
    segments: [
      'The item was logged and placed in the queue.',
      'A service ticket and diagnostic check were recorded.',
      'The technician completed the repair and verification.',
      'The work order closed after confirmation.'
    ],
    answers: {
      'maintenance-repair': 'yes',
      'maintenance-technician': 'yes'
    }
  },
  {
    id: 'incident-alert',
    groundTruthDomain: 'incident',
    segments: [
      'The item was registered and placed in the queue.',
      'An alert record was attached and the record was updated.',
      'The responder completed triage and containment.',
      'A root cause analysis closed the incident review.'
    ],
    answers: {
      'incident-containment': 'yes',
      'incident-root-cause': 'yes'
    }
  },
  {
    id: 'incident-generic',
    groundTruthDomain: 'incident',
    segments: [
      'The alert was recorded and placed in the staging area.',
      'An incident id was attached and the status was updated.',
      'Containment followed the severity review.',
      'The retrospective documented the root cause.'
    ],
    answers: {
      'incident-containment': 'yes',
      'incident-root-cause': 'yes'
    }
  },
  {
    id: 'incident-forensic',
    groundTruthDomain: 'incident',
    segments: [
      'The event was entered in the system and placed in the queue.',
      'An alert record was attached and the manifest was updated.',
      'The case was isolated after triage.',
      'Forensic review completed the root cause analysis.'
    ],
    answers: {
      'incident-containment': 'yes',
      'incident-root-cause': 'yes'
    }
  },
  {
    id: 'incident-postmortem',
    groundTruthDomain: 'incident',
    segments: [
      'The alert was logged and placed in the queue.',
      'An incident record was attached and the record was updated.',
      'Containment and triage both remained active.',
      'The postmortem closed the incident after analysis.'
    ],
    answers: {
      'incident-containment': 'yes',
      'incident-root-cause': 'yes'
    }
  },
  {
    id: 'compliance-policy',
    groundTruthDomain: 'compliance',
    segments: [
      'The item was registered and placed in the queue.',
      'A compliance record was attached and the record was updated.',
      'The reviewer completed the policy check and documented the exception request.',
      'Control owner sign-off archived the record.'
    ],
    answers: {
      'compliance-exception': 'yes',
      'compliance-signoff': 'yes'
    }
  },
  {
    id: 'compliance-generic',
    groundTruthDomain: 'compliance',
    segments: [
      'The record was entered in the system and placed in the staging area.',
      'A policy file was attached and the status was updated.',
      'A waiver was reviewed against policy before approval.',
      'The control archive retained the sign-off.'
    ],
    answers: {
      'compliance-exception': 'yes',
      'compliance-signoff': 'yes'
    }
  },
  {
    id: 'compliance-waiver',
    groundTruthDomain: 'compliance',
    segments: [
      'The file was logged and placed in the queue.',
      'A control record was attached and the manifest was updated.',
      'The exception request remained open during the policy check.',
      'Control owner approval completed the attestation archive.'
    ],
    answers: {
      'compliance-exception': 'yes',
      'compliance-signoff': 'yes'
    }
  },
  {
    id: 'compliance-archive',
    groundTruthDomain: 'compliance',
    segments: [
      'The item was recorded and placed in the staging area.',
      'A compliance record was attached and the record was updated.',
      'The review against policy requested a waiver before sign-off.',
      'The audit log stored the approved record.'
    ],
    answers: {
      'compliance-exception': 'yes',
      'compliance-signoff': 'yes'
    }
  }
];

const openSetCases = [
  {
    id: 'clinical-enrollment',
    groundTruthDomain: 'clinical',
    noveltyType: 'open-set',
    segments: [
      'The item was registered and placed in the queue.',
      'A participant record was attached and the status was updated.',
      'Screening cleared it for enrollment.',
      'Follow-up scheduling confirmed activation.'
    ]
  },
  {
    id: 'clinical-consent',
    groundTruthDomain: 'clinical',
    noveltyType: 'open-set',
    segments: [
      'The record was entered in the system and placed in the staging area.',
      'A consent form and participant identifier were attached.',
      'Eligibility review completed the screening step.',
      'Enrollment moved it into follow-up.'
    ]
  },
  {
    id: 'legal-intake',
    groundTruthDomain: 'legal',
    noveltyType: 'open-set',
    segments: [
      'The request was recorded and placed in the queue.',
      'A complaint file and case number were attached and the status was updated.',
      'Conflict screening cleared it for legal review.',
      'Counsel assignment confirmed the intake.'
    ]
  },
  {
    id: 'legal-escalation',
    groundTruthDomain: 'legal',
    noveltyType: 'open-set',
    segments: [
      'The file was logged and placed in the staging area.',
      'A matter record and evidence bundle were attached.',
      'Privilege review escalated it for attorney approval.',
      'Docket entry confirmed the next action.'
    ]
  },
  {
    id: 'quality-nonconformance',
    groundTruthDomain: 'quality',
    noveltyType: 'open-set',
    segments: [
      'The issue was recorded and placed in the queue.',
      'A deviation report and batch identifier were attached.',
      'Root-cause review opened a corrective action.',
      'Verification testing confirmed closure readiness.'
    ]
  },
  {
    id: 'quality-release',
    groundTruthDomain: 'quality',
    noveltyType: 'open-set',
    segments: [
      'The lot was entered in the system and moved into staging.',
      'A release packet and inspection record were attached.',
      'Quality approval cleared it for shipment.',
      'Final disposition confirmed release.'
    ]
  },
  {
    id: 'logistics-routing',
    groundTruthDomain: 'logistics',
    noveltyType: 'open-set',
    segments: [
      'The shipment was registered and placed in the queue.',
      'A routing sheet and carrier booking were attached.',
      'Route planning selected the transfer lane.',
      'Hub assignment confirmed the dispatch path.'
    ]
  },
  {
    id: 'logistics-customs',
    groundTruthDomain: 'logistics',
    noveltyType: 'open-set',
    segments: [
      'The consignment was recorded and placed in the staging area.',
      'A customs packet and tariff record were attached.',
      'Border review requested a declaration check.',
      'Clearance release confirmed onward movement.'
    ]
  },
  {
    id: 'hiring-onboarding',
    groundTruthDomain: 'hiring',
    noveltyType: 'open-set',
    segments: [
      'The candidate record was entered in the system and placed in the queue.',
      'An offer packet and employee identifier were attached.',
      'Background review cleared the onboarding step.',
      'Orientation scheduling confirmed activation.'
    ]
  },
  {
    id: 'hiring-clearance',
    groundTruthDomain: 'hiring',
    noveltyType: 'open-set',
    segments: [
      'The applicant file was logged and moved into staging.',
      'A clearance checklist and access request were attached.',
      'Manager approval released the start date.',
      'Credential setup confirmed the hire.'
    ]
  },
  {
    id: 'hybrid-package-sample',
    groundTruthDomain: null,
    noveltyType: 'hybrid',
    segments: [
      'The item was registered and placed in the queue.',
      'A routing label and specimen identifier were both attached.',
      'The temperature log remained active before dispatch.',
      'Archive intake and destination confirmation were both recorded.'
    ],
    answers: {
      'package-dispatch': 'yes',
      'package-tracking': 'yes',
      'sample-temperature': 'yes',
      'sample-assay': 'no'
    }
  },
  {
    id: 'hybrid-manuscript-compliance',
    groundTruthDomain: null,
    noveltyType: 'hybrid',
    segments: [
      'The file was recorded and placed in the staging area.',
      'A policy file and submission record were both attached.',
      'Review against policy continued while the editor requested changes.',
      'Sign-off and revision were both noted before closure.'
    ],
    answers: {
      'manuscript-review': 'yes',
      'manuscript-revision': 'yes',
      'compliance-exception': 'no',
      'compliance-signoff': 'yes'
    }
  },
  {
    id: 'hybrid-legal-quality',
    groundTruthDomain: null,
    noveltyType: 'hybrid',
    segments: [
      'The file was recorded and placed in the queue.',
      'A deviation report and evidence bundle were both attached.',
      'Root-cause review continued while counsel requested escalation.',
      'Corrective action and docket entry were both logged before closure.'
    ],
    answers: {
      'incident-containment': 'no',
      'compliance-exception': 'yes',
      'compliance-signoff': 'yes',
      'manuscript-review': 'no'
    }
  },
  {
    id: 'hybrid-clinical-logistics',
    groundTruthDomain: null,
    noveltyType: 'hybrid',
    segments: [
      'The participant shipment was registered and placed in the queue.',
      'A consent packet and routing sheet were both attached.',
      'Eligibility review completed while route planning selected the transfer lane.',
      'Enrollment scheduling and hub assignment were both confirmed.'
    ],
    answers: {
      'package-dispatch': 'yes',
      'package-tracking': 'yes',
      'sample-temperature': 'no',
      'sample-assay': 'no'
    }
  }
];

const SHARED_PARAPHRASE_REPLACEMENTS = [
  ['registered', 'logged'],
  ['recorded', 'captured'],
  ['entered in the system', 'entered into the ledger'],
  ['placed in the queue', 'moved into the work queue'],
  ['placed in the staging area', 'moved into staging'],
  ['attached', 'linked'],
  ['record was updated', 'entry was refreshed'],
  ['status was updated', 'status entry was refreshed'],
  ['manifest was updated', 'manifest entry was refreshed'],
  ['confirmed', 'verified'],
  ['acknowledged', 'confirmed'],
  ['before', 'ahead of']
];

const DOMAIN_PARAPHRASE_REPLACEMENTS = {
  package: [
    ['courier', 'shipping operator'],
    ['dispatch', 'handoff'],
    ['delivery', 'handover'],
    ['recipient', 'receiver']
  ],
  sample: [
    ['analysis', 'processing'],
    ['assay', 'lab processing'],
    ['archive', 'retention store'],
    ['temperature', 'environment']
  ],
  manuscript: [
    ['reviewers', 'assessors'],
    ['review', 'evaluation'],
    ['revision', 'amendment'],
    ['accepted', 'approved']
  ],
  procurement: [
    ['purchase request', 'procurement request'],
    ['vendor quote', 'supplier quotation'],
    ['invoice', 'billing record'],
    ['payment order', 'settlement order']
  ],
  maintenance: [
    ['service ticket', 'service order'],
    ['inspection', 'diagnostic review'],
    ['repair', 'service repair'],
    ['closure note', 'closeout note']
  ],
  incident: [
    ['triage', 'severity review'],
    ['containment', 'isolation'],
    ['root cause', 'causal analysis'],
    ['postmortem', 'incident retrospective']
  ],
  compliance: [
    ['policy check', 'control review'],
    ['exception request', 'waiver request'],
    ['sign-off', 'formal approval'],
    ['audit log', 'attestation log']
  ]
};

const SHARED_NOISY_REPLACEMENTS = [
  ['registered', 'logged'],
  ['recorded', 'noted'],
  ['record was updated', 'entry refreshed'],
  ['status was updated', 'status refreshed'],
  ['confirmed', 'marked complete']
];

function replaceAllCaseInsensitive(text, search, replacement) {
  return text.replace(new RegExp(`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), replacement);
}

function applyReplacements(text, replacements) {
  return replacements.reduce(
    (current, [search, replacement]) => replaceAllCaseInsensitive(current, search, replacement),
    text
  );
}

function enrichAnswers(caseRecord, questionIds) {
  return Object.fromEntries(questionIds.map((questionId) => [questionId, caseRecord.answers?.[questionId] ?? 'no']));
}

function assignSplits(baseCases) {
  const totals = baseCases.reduce((result, caseRecord) => {
    result.set(caseRecord.groundTruthDomain, (result.get(caseRecord.groundTruthDomain) ?? 0) + 1);
    return result;
  }, new Map());
  const counts = new Map();

  return baseCases.map((caseRecord) => {
    const index = counts.get(caseRecord.groundTruthDomain) ?? 0;
    counts.set(caseRecord.groundTruthDomain, index + 1);

    return {
      ...caseRecord,
      split: index < Math.ceil((totals.get(caseRecord.groundTruthDomain) ?? 0) / 2) ? 'dev' : 'test'
    };
  });
}

function transformSegments(caseRecord, stratum) {
  const domainReplacements = DOMAIN_PARAPHRASE_REPLACEMENTS[caseRecord.groundTruthDomain] ?? [];

  if (stratum === 'controlled') {
    return caseRecord.segments;
  }

  if (stratum === 'paraphrased') {
    return caseRecord.segments.map((segment) =>
      applyReplacements(applyReplacements(segment, SHARED_PARAPHRASE_REPLACEMENTS), domainReplacements)
    );
  }

  return caseRecord.segments.map((segment, index) => {
    const transformed = applyReplacements(
      applyReplacements(segment, SHARED_NOISY_REPLACEMENTS),
      domainReplacements
    );

    if (index === 1) {
      return `Ops note: ${transformed} One field remained abbreviated.`;
    }

    if (index === 2) {
      return `${transformed} Earlier wording in the log was partial.`;
    }

    if (index === 3) {
      return `Administrative follow-up: ${transformed}`;
    }

    return transformed;
  });
}

async function readCoreCases() {
  return JSON.parse(await readFile(coreCasesPath, 'utf8'));
}

async function readBenchmarkCases() {
  const questionIds = benchmarkDomains.flatMap((domain) => domain.questions.map((question) => question.id));
  const baseCases = assignSplits([
    ...(await readCoreCases()).map((caseRecord) => ({
      ...caseRecord,
      answers: enrichAnswers(caseRecord, questionIds),
      benchmarkFamily: 'core'
    })),
    ...additionalBaseCases.map((caseRecord) => ({
      ...caseRecord,
      answers: enrichAnswers(caseRecord, questionIds),
      benchmarkFamily: 'extended'
    }))
  ]);
  const strata = ['controlled', 'paraphrased', 'noisy'];

  return baseCases.flatMap((caseRecord) =>
    strata.map((stratum) => ({
      ...caseRecord,
      id: `${caseRecord.id}__${stratum}`,
      sourceCaseId: caseRecord.id,
      stratum,
      segments: transformSegments(caseRecord, stratum)
    }))
  );
}

function readNoveltyCases() {
  const questionIds = benchmarkDomains.flatMap((domain) => domain.questions.map((question) => question.id));

  return openSetCases.map((caseRecord) => ({
    ...caseRecord,
    split: 'test',
    answers: enrichAnswers(caseRecord, questionIds)
  }));
}

export { benchmarkDomains, readBenchmarkCases, readNoveltyCases };
