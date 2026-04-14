# DS007 - Usage Best Practices

## Introduction
This specification describes how to get reliable value from the library in real usage. The architecture is most effective when a system must keep several local explanations alive, contract them deliberately, and explain why a later update changed the retained frontier. Best practice is therefore less about tuning one winner and more about preserving the right audit trail from source evidence to frontier update.

## Core Content
The first best practice is to preserve source structure rather than flattening it away. When the input arrives as several segments, timestamps, or document regions, the host application should provide that structure explicitly. Segment boundaries, source identifiers, observer choice, and budget settings are part of the evidence contract because they shape what the observational layer can later justify. This is especially important when later questions or updates must be explained against a concrete source trace.

The second best practice is to keep the frontier genuinely plural but still small. Budgets should be large enough to preserve meaningful alternatives and small enough to keep the neighborhood interpretable. In the current implementation this usually means a modest number of observational hypotheses and a bounded frontier rather than a single forced answer. A useful frontier is one that still contains recoverable alternatives without collapsing into an undifferentiated dump of weak candidates.

The third best practice is to treat questions as first-class interventions rather than fallback prompts. When ambiguity remains, the recommended question is part of the normal workflow. Good usage means asking the question that best separates the active local theories, then applying the answer through incremental update instead of restarting analysis from scratch. This is how the library turns uncertainty into an explicit, inspectable revision path.

The fourth best practice is to keep CNL traces and numeric summaries together. The canonical CNL bundle explains what the system retained and why; the numeric summaries show how much uncertainty remains and how strongly the frontier contracts. Experiments, debugging workflows, and downstream review tools should therefore retain both forms together. A number without a trace is too thin, and a trace without summary metrics is too hard to compare across runs.

The fifth best practice is to use learned assistance only where the architecture already permits it. Input normalization may clean up noisy wording or supply bounded inferred preparation hints. Output articulation may summarize the retained frontier for a human reader. Frontier retention, score comparison, equivalence grouping, and update decisions should remain in the symbolic core. This keeps the library auditable and preserves the meaning of the canonical CNL contract.

The architecture is especially valuable for workflow traces, protocol evidence, incident narratives, scientific traces, compliance documents, and agent-memory candidates. These are the settings where several structured local explanations often remain plausible for a while and where later evidence must refine the active interpretation without erasing the reasoning path that led there.

## Conclusion
Best practice is to treat the library as an auditable theory-frontier subsystem rather than as a replacement for every form of extraction or classification. Its strongest value appears when structural ambiguity matters, when later evidence is expected, and when the path from source text to retained theory must remain inspectable.

### Critical Implementation Directives
1. Preserve source identifiers, segment boundaries, observer choice, and budget settings in every serious integration.
2. Retain canonical CNL traces alongside quantitative summaries so updates remain both comparable and explainable.
3. Prefer incremental question-driven contraction over premature single-winner collapse when ambiguity remains structurally relevant.
