# DS006 - Library Usage Contract

## Introduction
This specification defines how the library is meant to be used by host applications, experiments, and downstream tools. The library is not a final-answer generator. It is an engine for inducing, maintaining, and updating a small frontier of local theories under explicit uncertainty. Its operational value comes from preserving several disciplined explanations until evidence, task pressure, or budget justifies stronger contraction.

## Core Content
The usage model begins from a methodological constraint that already appears in the vision: input text is treated as a description of an observation or an interpretation, not as the phenomenon itself. The public contract must therefore preserve the separation between source context, observational hypotheses, local theories, neighborhood structure, and update effects. This is why the stable public surface should be a canonical CNL-oriented bundle rather than an opaque IR exposed accidentally through internal JavaScript fields.

The canonical processing contract has four stages that mirror the architecture: observational lifting, local theory induction, local rulial exploration, and alignment or lexicalization. A host application supplies raw text or segmented evidence, optional source metadata, an observer profile, and explicit hypothesis/frontier budgets. The library returns a bounded frontier bundle containing observational hypotheses, induced local theories, typed transformations, equivalence classes, robust and theory-sensitive consequences, discriminating questions, and a canonical CNL serialization of the same state. The frontier is therefore not an auxiliary debugging structure. It is the authoritative operating state of the library.

The canonical CNL should cover at least the following families of statements.

| CNL family | Operational role |
| --- | --- |
| `SOURCE` / `CONTEXT` | identifies the document, source span, observer, run metadata, and budget |
| `OBSERVATION` | records evidence units with explicit or inferred status, provenance, type, and domain relevance |
| `HYPOTHESIS` | groups observational statements into bounded observational hypotheses |
| `THEORY` | records schema, rules, invariants, compositions, support, and score profile for local theories |
| `TRANSFORM` | records refinement, coarsening, refactorization, and related neighborhood moves |
| `EQUIVALENCE` | records observer-relative indistinguishability classes |
| `SCORE` / `CONSEQUENCE` | records decomposed scores, robust consequences, and theory-sensitive consequences |
| `QUESTION` / `UPDATE` | records discriminating questions, answer-driven updates, and frontier changes |

The current repository instantiates this contract through a high-level evidence API. `analyzeEvidence(...)` accepts raw text, text segments, or an input object with source metadata. It returns a usage bundle containing the authoritative symbolic analysis together with deterministic CNL serialization. `applyEvidenceUpdate(...)` applies an answered discriminating question to that bundle and reserializes the updated frontier. Internal objects remain available for code-level consumers, but the CNL bundle is the stable comparison and audit surface.

Input-side LLM assistance is allowed only as bounded preparation. It may normalize wording, resolve messy surface variation, or suggest candidate entities, events, and relations that could help observational lifting. Those additions remain preparation metadata marked as inferred; they are not authoritative local theories. Output-side LLM assistance is allowed only after the frontier already exists, for explanation or conceptual articulation. It may summarize or paraphrase the retained frontier, but it must not overwrite the canonical CNL bundle, the frontier membership, the score profile, the equivalence classes, or the update trace.

## Conclusion
The correct way to use the library is to treat it as a frontier-management engine with a canonical audit surface. Applications may consume structured JavaScript objects for convenience, but the stable public contract should preserve the same distinctions that the theory and experiments rely on.

### Critical Implementation Directives
1. Accept raw text, segmented text, source metadata, observer choice, and explicit budgets through the high-level usage entry points.
2. Return both the symbolic analysis bundle and a canonical CNL serialization that preserves source, observation, theory, neighborhood, question, and update structure.
3. Keep LLM preparation and LLM articulation auxiliary; the authoritative frontier remains the deterministic symbolic result.
