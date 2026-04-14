# 2. Neuro-symbolic pipeline and epistemic labor

The pipeline exists to prevent premature collapse. The ambiguous workflow prefix from Chapter 1 should not move directly from text into a final ontology. Instead, it passes through four stages that change both the internal object being manipulated and the kind of epistemic commitment that is justified at that moment.

Figure 1 summarizes the pipeline. The stage labels inside the figure remain intentionally short. Their purpose is orientation. The surrounding prose explains what each stage actually contributes.

![Pipeline overview](assets/figure-1-pipeline.svg)
*Figure 1. The four-stage pipeline from report to aligned local theory neighborhood. The figure keeps labels short so the text can explain the epistemic role of each stage in full.*

## Stage 1. Observational lifting

Observational lifting converts a report into several candidate observational hypotheses. This is the natural site of bounded learned assistance because raw text contains ellipsis, lexical variation, underdetermined event structure, and missing local roles. A learned component may therefore help normalize or propose candidate observational fragments, but those fragments must be turned into typed, compositional symbolic concept objects with provenance before they can affect theory induction [MAO-2025].

The output of observational lifting is not a theory. It is a structured candidate account of what may have been observed, what was stated explicitly, and what remains unresolved. That separation is the first safeguard against methodological collapse.

## Stage 2. Local theory induction

For each observational hypothesis, the system induces one or more candidate local theories. A local theory proposes a typed state schema, a family of rewrite templates, a set of invariants, and a discipline of admissible composition. This is the stage where the symbolic side of the architecture dominates. Categorical rewriting is treated as typed local transformation rather than as an unstructured state diff, which is why compatibility and composition become first-class concerns [DUVAL-2011].

## Stage 3. Local rulial exploration

Theories induced from the same observation are not treated as isolated outputs. They are organized into a local neighborhood through refinement, coarsening, refactorization, and observer shift. The neighborhood separates robust consequences from theory-sensitive consequences and retains a bounded frontier of theories that remain worth tracking. That neighborhood perspective is what makes the framework ruliological in practice: it studies nearby rule-bearing possibilities instead of rushing toward one prematurely reified interpretation [WOLFRAM-2026].

## Stage 4. Alignment and lexicalization

Only after a retained neighborhood exists does alignment become appropriate. At that point the system may compare retained theories with external ontologies, prior concept libraries, or domain repertoires. Applied category theory matters here because alignment is not merely naming. It is category-level disciplined translation between structured domains, with preservation of the relations that matter under that translation [FONG-SPIVAK-2019].

Table 1 summarizes the epistemic role of the four stages.

| Stage | Input | Output | Why the stage stays separate |
| --- | --- | --- | --- |
| Observational lifting | Report text or structured evidence | Several observational hypotheses | It keeps report and theory distinct. |
| Local theory induction | One observational hypothesis | Several candidate local theories | It keeps schemas, rewrites, and invariants explicit. |
| Local rulial exploration | Candidate theories plus observer and question family | Retained neighborhood and frontier | It preserves plural local structure under bounded commitment. |
| Alignment and lexicalization | Retained neighborhood | Aligned conceptual articulation | It delays naming until symbolic structure exists. |

The same staged discipline governs the public usage surface. A host application supplies source evidence, source metadata, an observer profile, and optional policy overrides. The system returns a canonical frontier bundle whose stable projection still distinguishes source context, observations, local theories, transforms, equivalence classes, questions, updates, and consequences. Optional Achilles-backed LLM calls remain configurable through explicit task tags, model tiers, and manual overrides, but they do not override the authoritative symbolic frontier.
