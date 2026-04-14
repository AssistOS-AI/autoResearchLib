# DS001 - Library Architecture

## Introduction
This specification describes the architecture as a reusable framework for local rulial exploration rather than as a one-off classifier. The architecture must explain how textual evidence becomes structured observation, how observation becomes local theory, how local theories become a maintained neighborhood, and how semantic articulation happens only after symbolic structure already exists. The aim is not implementation cleverness. The aim is a disciplined separation of stages and commitments.

## Core Content
The architecture has four stages.

| Stage | Primary input | Primary operation | Primary output | Commitment rule |
| --- | --- | --- | --- | --- |
| Observational lifting | Textual report or structured evidence | Construct several observational hypotheses with provenance and uncertainty | `O(x)` | Do not infer a final theory here |
| Local theory induction | One observational hypothesis | Propose candidate schemas, invariants, rewrite templates, and admissible compositions | Candidate local theories | Keep several compatible theories alive |
| Local rulial exploration | Candidate local theories plus observer/query family | Generate nearby theories, typed transformations, equivalence classes, and robust consequences | Local neighborhood `N(Oi)` | Retain a bounded frontier instead of one winner |
| Alignment and lexicalization | Retained neighborhood | Compare with external repertoires and articulate theories conceptually | Aligned descriptions and explanations | Lexicalize only after symbolic structure exists |

The stable public usage surface should preserve these stages instead of hiding them behind an opaque result object. Host applications should be able to provide raw text or segmented evidence together with source metadata, observer choice, and explicit budgets, then receive a canonical frontier bundle that still distinguishes source context, observational content, local theories, transformations, equivalence classes, consequences, questions, and updates. Internal JavaScript objects may remain richer for implementation efficiency, but the externally comparable contract should remain a canonical CNL-oriented surface rather than a repository-private IR.

Observational lifting is the natural place for bounded neural assistance. Natural language contains ellipsis, presupposition, coreference, and underdetermined event structure. A learned component may therefore help propose structured event or relation hypotheses. Even then, the neural component is not permitted to output the final theory. Its task is to propose candidate observational structures that are then stored, typed, constrained, and compared symbolically.

Local theory induction is where symbolic structure dominates. For one observational hypothesis, the system proposes several local theories that explain the observed entities, states, transitions, and constraints. A theory candidate should make explicit its state schema, its rewrite templates, its invariants, and the compatibility rules under which local rewrites may compose. This is the point where categorical abstract rewriting becomes relevant: local transformations are not merely edits, but typed and composable operations whose compatibility matters [DUVAL-2011].

Local rulial exploration is the stage that gives the framework its ruliological character. Theories induced from the same observation are not treated as isolated alternatives. They are organized into a local neighborhood through refinement, coarsening, refactorization, and observer shift. The system computes which consequences are robust across that neighborhood and which remain theory-sensitive. The result is a bounded local geometry of theory space rather than an unordered list of candidate explanations.

Alignment and lexicalization are deliberately late stages. Once a neighborhood of local theories exists, the system may compare those theories with external ontologies, scientific repertoires, domain models, or prior concept libraries. Applied category theory matters here because the alignment problem is not mere naming. It concerns disciplined translation between structured regimes and preservation of meaningful relations under that translation [FONG-SPIVAK-2019]. Only after such alignment is lexicalization appropriate.

The architecture must remain generic at the engine level and replaceable at the domain level. Domain bundles provide vocabularies, state roles, invariants, rewrite templates, observer cues, and candidate discriminating questions. The engine remains responsible for retaining the frontier, computing equivalence classes, comparing score profiles, and serializing results. That separation is what lets the same architectural discipline support workflow traces today and other structured evidence tomorrow.

The same architecture clarifies the role of optional LLM assistance. AchillesAgentLib-backed `LLMAgent` calls may help in observational lifting and in alignment-friendly conceptual explanation when these steps are explicitly enabled. The deterministic symbolic core remains authoritative for frontier scoring, theory retention, canonical CNL serialization, and experiment metrics. The learned component proposes or articulates. The symbolic component stores, constrains, compares, audits, and decides.

## Conclusion
The architecture should therefore be read as a division of epistemic labor. Neural components support flexible lifting and articulation where ambiguity is irreducible. Symbolic components govern theories, transformations, compositions, incompatibilities, and retained consequences where auditability is essential.

### Critical Implementation Directives
1. Keep domain knowledge in explicit bundles that can be swapped without modifying the frontier or neighborhood logic.
2. Preserve provenance, score components, and transformation structure at every stage so article claims and experiments remain traceable.
3. Treat question generation, observer-relative equivalence, frontier update, and canonical frontier serialization as first-class capabilities of the core framework.
