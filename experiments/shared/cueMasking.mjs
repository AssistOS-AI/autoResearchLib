const CUE_MASK_REPLACEMENTS = [
  ['decision letter', 'notice'],
  ['associate editor', 'coordinator'],
  ['editorial queue', 'queue'],
  ['submission record', 'record'],
  ['specimen identifier', 'identifier'],
  ['temperature log', 'record'],
  ['freezer storage', 'storage'],
  ['sample archive', 'archive'],
  ['specimen archive', 'archive'],
  ['routing number', 'record number'],
  ['tracking number', 'record number'],
  ['tracking code', 'code'],
  ['routing label', 'label'],
  ['routing tag', 'tag'],
  ['pickup manifest', 'manifest'],
  ['sample id', 'identifier'],
  ['vial label', 'label'],
  ['cold room', 'storage'],
  ['peer review', 'evaluation'],
  ['review cycle', 'cycle'],
  ['reviewers', 'team'],
  ['reviewer', 'team member'],
  ['manuscript id', 'identifier'],
  ['manuscript', 'document'],
  ['revision', 'update'],
  ['courier', 'handler'],
  ['carrier', 'team'],
  ['dispatch', 'handoff'],
  ['delivery', 'completion'],
  ['recipient', 'receiver'],
  ['barcode', 'marker'],
  ['temperature', 'conditions'],
  ['analysis', 'processing'],
  ['assay', 'processing'],
  ['aliquot', 'portion'],
  ['centrifuged', 'prepared'],
  ['editor', 'coordinator'],
  ['journal', 'office'],
  ['paper', 'document'],
  ['accepted', 'approved'],
  ['review', 'evaluation'],
  ['biobank', 'archive'],
  ['purchase request', 'request'],
  ['vendor quote', 'quote'],
  ['supplier quote', 'quote'],
  ['approval', 'clearance'],
  ['invoice', 'record'],
  ['payment order', 'order'],
  ['service ticket', 'ticket'],
  ['work order', 'order'],
  ['technician', 'operator'],
  ['repair', 'service'],
  ['inspection', 'check'],
  ['alert record', 'record'],
  ['incident record', 'record'],
  ['triage', 'review'],
  ['containment', 'mitigation'],
  ['root cause', 'issue'],
  ['postmortem', 'review'],
  ['compliance record', 'record'],
  ['policy check', 'review'],
  ['exception request', 'request'],
  ['sign-off', 'approval'],
  ['audit log', 'archive']
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskText(text) {
  return CUE_MASK_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) =>
      current.replace(new RegExp(`\\b${escapePattern(pattern)}\\b`, 'gi'), replacement),
    text
  );
}

export { maskText };
