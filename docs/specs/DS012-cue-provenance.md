# DS012 - Cue Provenance

## Introduction
The library treats cues as the smallest typed units that can influence theory induction. This specification defines how those cues should carry provenance so later CNL traces, experiment artifacts, and article claims can point back to concrete evidence rather than vague phrases.

## Core Content
Cue provenance should preserve the distinction between explicit evidence and inferred evidence.

| Cue type | Required provenance |
| --- | --- |
| Explicit cue | matched source segment identifier plus absolute character span when segmented evidence is available |
| Explicit cue without segment structure | matched phrase text |
| Inferred cue | inference-rule identifier that justified the derived cue |

The current public usage path already accepts either plain text or explicit segments. When segments are supplied, the preparation stage constructs deterministic `SEGMENT` identifiers and absolute source spans. Explicit cue matches should then be serialized as `PROVENANCE` lines containing at least `kind`, `segment`, `span`, and cue identifier. Inferred cues should serialize their rule identifier instead of pretending they were observed literally in the source text.

This provenance is intentionally bounded. It does not attempt to reconstruct full semantic alignment between natural-language clauses and symbolic state schemas. Its role is narrower and operational: make it possible to inspect why a cue entered the observational layer and which part of the source or which inference rule justified it.

## Conclusion
Bounded provenance keeps observational lifting auditable without turning the library into a full document-annotation system. That balance is sufficient for the current theory-frontier use case and for the canonical CNL contract.

### Critical Implementation Directives
1. Preserve segment identifiers and absolute source spans for explicit cues whenever segmented evidence is available.
2. Distinguish matched-span provenance from inference-rule provenance in canonical CNL.
3. Keep provenance attached to cues all the way from observational lifting through serialized experiment artifacts.
