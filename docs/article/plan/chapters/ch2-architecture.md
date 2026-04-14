# 2. Neuro-symbolic pipeline

The architecture is organized around staged commitment. Structured evidence is not forced immediately into one final ontology. Instead, the system passes through four stages that progressively change what kind of object is being manipulated and what kind of commitment is justified at that point.

Figure 1 summarizes this pipeline. The labels inside the boxes are intentionally brief. Their job is to identify the stage, while the surrounding prose explains the epistemic work performed inside each one.

![Pipeline overview](assets/figure-1-pipeline.svg)
*Figure 1. The four-stage pipeline from report to aligned local theory neighborhood. The figure uses short labels and internal glyphs; the text explains the theoretical role of each stage.*

## Stage 1. Observational lifting

Observational lifting converts a report into several candidate observational hypotheses. This stage is naturally neuro-symbolic because natural language contains ellipsis, presupposition, lexical variation, coreference, and underdetermined event structure. A learned component may therefore help propose candidate event or relation structures, but those proposals must be converted into explicit typed and compositional neuro-symbolic concept records with provenance and uncertainty annotations before they can influence theory induction [MAO-2025].

The output of observational lifting is not a theory. It is a structured hypothesis about what may have been observed or asserted. This is the first safeguard against methodological collapse.

## Stage 2. Local theory induction

For each observational hypothesis, the system induces one or more candidate local theories. A local theory proposes a typed state schema, a family of rewrite templates, a set of invariants, and a discipline of admissible composition. This is the point where the symbolic side of the architecture dominates. Categorical rewriting is treated as typed local transformation rather than as an unstructured state diff, which is why compatibility and composition become first-class concerns [DUVAL-2011].

## Stage 3. Local rulial exploration

Theories induced from the same observation are not treated as isolated outputs. They are organized into a local neighborhood through refinement, coarsening, refactorization, and observer shift. This stage separates robust consequences from theory-sensitive consequences and maintains a bounded frontier of theories that remain worth retaining. That neighborhood perspective is what makes the framework ruliological in an operational sense: it treats nearby spaces of possible rules as objects of study instead of rushing toward a single prematurely reified interpretation [WOLFRAM-2026].

## Stage 4. Alignment and lexicalization

Only after a retained neighborhood exists does alignment become appropriate. At that point the system may compare a local theory with an external ontology, a domain model, or a previously learned concept library. Applied category theory matters here because the problem is not merely one of naming. It is a problem of category-level disciplined translation between structured regimes and of preserving meaningful relations under that translation [FONG-SPIVAK-2019].

Table 1 summarizes the epistemic role of the four stages.

| Stage | Input | Output | Why this stage stays separate |
| --- | --- | --- | --- |
| Observational lifting | Report text or other structured evidence | Several observational hypotheses | It keeps report and theory distinct. |
| Local theory induction | One observational hypothesis | Several candidate local theories | It keeps typed schemas, rewrites, and invariants explicit. |
| Local rulial exploration | Candidate theories plus observer/query family | Local theory neighborhood and retained frontier | It preserves plural local structure under bounded commitment. |
| Alignment and lexicalization | Retained neighborhood | Aligned conceptual descriptions | It delays naming until symbolic structure already exists. |

In the reference implementation, learned assistance is confined to bounded lifting-friendly normalization before observational lifting and to late conceptual articulation after the frontier has already been retained. The retained frontier, the score profile, and the experiment metrics remain authoritative products of the symbolic core.

The same staged discipline appears at the public usage surface. A host application supplies source text or segmented evidence together with source metadata, an observer profile, and explicit budgets. The system returns a bounded frontier bundle whose canonical projection still distinguishes source context, observations, local theories, transforms, equivalence classes, consequences, questions, and updates. This matters because the architecture is intended to be used as an auditable theory-frontier engine, not as a hidden text-to-label shortcut.
