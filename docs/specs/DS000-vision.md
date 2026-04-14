# DS000 - Vision

## Introduction
The project starts from a methodological problem rather than from a preferred model family. Ruliology studies what abstract rules do and how spaces of possible rules are organized [WOLFRAM-2026]. Applied category theory studies disciplined composition and structure-preserving translation across domains [FONG-SPIVAK-2019]. Neuro-symbolic work argues that learned systems are most useful when they still operate over typed and compositional conceptual carriers [MAO-2025]. These lines reinforce one another only if the architecture respects a basic distinction: a text report is not the phenomenon itself, and it is not yet a theory of that phenomenon.

## Core Content
The vision begins with a simple example. A short workflow note may say that an item was logged, labeled, and the record was updated. That text does not yet determine whether the local organization is package handling, sample handling, manuscript processing, procurement, or another family. A useful system should therefore not jump directly from text to final theory. It should preserve a structured observational object, induce several compatible local theories, and retain them long enough for later evidence or questioning to justify stronger commitment.

The objective is not final-label prediction. The objective is construction of a bounded local region of theory space around the available evidence. The system first lifts an input report into a family of observational hypotheses `O(x)`. Each hypothesis stores typed cues, provenance, uncertainty, and domain support. It then induces candidate local theories `T = (Sigma, I, R, C, S)` and organizes them into local neighborhoods `N(Oi)` connected by typed local moves. The frontier is the active subset of those theories that remain worth retaining under the current evidence, budget, and observer.

This is the operational meaning of meta-rationality in the project. Meta-rationality is disciplined non-reification. It is the refusal to treat the earliest available abstraction as final when several structured local explanations remain defensible. The frontier is therefore not rhetorical pluralism. It is a bounded retention discipline backed by explicit score dimensions, explicit transforms, explicit equivalence classes, and explicit question-driven updates.

The project makes three distinct contributions.

1. **Conceptual contribution.** It proposes a theory-first architecture that separates report, observation, local theory, neighborhood geometry, and lexicalized explanation.
2. **Formal contribution.** It operationalizes that architecture with explicit objects for hypotheses, local theories, typed transforms, equivalence classes, consequence profiles, discriminating questions, and frontier updates.
3. **Validation contribution.** It now supports those claims with a seven-experiment ladder covering structural validation, sensitivity and ablation, broader benchmark transfer, novelty handling, and multi-step questioning.

These contributions must stay distinct from the current implementation boundary. `autoResearchLib` is the reference implementation of the framework, not the framework itself. The repository currently validates that richer observers contract the frontier earlier, that questioning reduces uncertainty and improves recovery on ambiguous traces, that the deterministic policy is robust across a nearby parameter region, that a seven-domain benchmark still favors frontier retention over simpler baselines, and that novelty cases trigger more uncertainty than ordinary in-domain traces. It does not yet validate full open-ended theory induction, genuine synthesis of new domain families, or strong robustness under adversarial multi-step evidence.

## Conclusion
The project should therefore be understood as a disciplined research implementation of a broader thesis: useful induction from text requires a bounded local theory frontier, explicit transforms across nearby theories, and explicit refusal to collapse uncertainty too early. That thesis is ambitious, but the implementation should only claim what the current ladder of experiments actually supports.

### Critical Implementation Directives
1. Keep the distinction between textual report, observational hypothesis, local theory, and retained frontier explicit in both code and article prose.
2. Separate conceptual claims, formal claims, and currently validated claims whenever the framework is described.
3. State current limits plainly when novelty handling or adversarial questioning exceed what the implementation can currently support.
