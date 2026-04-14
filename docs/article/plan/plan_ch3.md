---
chapter: 3
title: Formal model and frontier management
target: chapters/ch3-data-model.md
dependsOn:
  - ../../specs/DS002-data-model.md
  - ../../specs/DS001-library-architecture.md
  - ../../specs/DS006-library-usage.md
---

# Plan CH3 - Formal model and frontier management

## Chapter Intent
Make the theoretical objects and the core algorithms explicit in the same operational form used by the implementation. The reader should leave the chapter understanding the observational hypothesis family, the local theory, the local neighborhood, the retained frontier, the score profile, the discriminating-question update, and a concrete worked example of how ambiguity is preserved and then reduced.

## Paragraph Plan

| Paragraph | Source files | Guidance |
| --- | --- | --- |
| P1 | `DS002 Introduction`, `DS002 Core Content` | Introduce `O(x)`, `T`, `N(Oi)`, and the frontier `F` as auditable objects rather than abstract placeholders. |
| P2 | `DS002 Core Content`, `DS006 Core Content` | Explain the operational observation model, including explicit/inferred cues and the current domain-support formula, then state that the same objects are projected to a canonical CNL surface. |
| P3 | `DS002 Core Content` | Explain the score profile, the scalar weighting, and why named dimensions remain primary even when totals are computed. |
| P4 | `DS002 Core Content` | Introduce Figure 2 as the geometry of the local neighborhood: theory family, transformation family, equivalence classes, and consequence profile. Cite Duval only here. |
| P5 | `DS002 Core Content` | Add a worked example using an ambiguous generic workflow prefix that initially keeps package, manuscript, and sample theories alive, then uses one negative dispatch answer to remove the package family. |
| P6 | `DS001 Core Content`, `DS002 Core Content` | Introduce the three algorithms as one operational loop and explain what each stage preserves. |
| P7 | `DS002 Core Content` | Explain `OBSERVATIONAL_LIFT` with more detail than before: bounded plural hypotheses, provenance, and cue typing. |
| P8 | `DS002 Core Content`, `DS001 Core Content` | Explain `LOCAL_RULIAL_EXPLORATION` as neighborhood generation plus frontier retention, not as single-label scoring. |
| P9 | `DS002 Core Content` | Explain `RULIAL_NEIGHBORHOOD_UPDATE` with explicit mention of information gain, score deltas, and frontier rescue. |
| P10 | `DS002 Conclusion` | Close by stating that the frontier is the operational form of epistemic restraint. |

## Generated Chapter Template

# 3. Formal model and frontier management

The framework revolves around four explicit objects. `O(x) = {O0, O1, ..., On}` stores observational hypotheses derived from a report. `T = (Sigma, I, R, C, S)` stores a local theory with a state schema, invariants, rewrite templates, a compositional discipline, and a decomposed score profile. `N(Oi) = (Ti, Mi, Ei, Qi)` stores the local neighborhood retained for one observational hypothesis. `F` stores the active frontier of theories that remain worth retaining under the current evidence and budget. The point of these objects is practical: every transition from text to theory remains inspectable.

The observation layer is already operational rather than metaphorical. Each observational hypothesis stores explicit cues, inferred cues, source spans, a domain-support map, and a bounded focus policy. In the current implementation the support for a domain is `0.3 * genericSignal + explicitSignal + 0.7 * inferredSignal`. The base hypothesis keeps all cues, while focused hypotheses keep generic cues plus the cues of domains that remain close enough to the best current support. This is why the architecture can preserve several structured observation candidates without pretending that the earliest prefix already determines the case uniquely.

The same objects are also exposed through a canonical CNL projection. Source context, observations, hypotheses, theories, transforms, equivalence classes, consequences, questions, and updates are serialized as deterministic keyword-led lines so the library, the experiments, and the article all refer to the same operational state rather than to three different descriptive layers. The CNL is therefore a stable audit surface for the model, not a second theory beside it.

The local theory is equally explicit. For each retained hypothesis and each domain family, the system materializes a state schema, invariant set, rewrite family, composition discipline, and a six-part score profile. The named dimensions are `evidenceCoverage`, `predictiveAdequacy`, `compressionUtility`, `compositionalSharpness`, `stability`, and `alignmentUtility`. The current scalar total is `0.22 * evidenceCoverage + 0.28 * predictiveAdequacy + 0.10 * compressionUtility + 0.16 * compositionalSharpness + 0.14 * stability + 0.10 * alignmentUtility`. The total matters for ranking and entropy, but it does not replace the named dimensions because different theories remain useful for different reasons.

Table 2 summarizes the score dimensions used in the current framework.

| Score dimension | Meaning in the current implementation | Weight in total |
| --- | --- | --- |
| Evidence coverage | Fraction of the available observational signal explained by the theory | 0.22 |
| Predictive adequacy | Compatibility of the theory with the matched local state evolution | 0.28 |
| Compression utility | Structured summary value without gratuitous local complexity | 0.10 |
| Compositional sharpness | Clarity of typed rewrites and admissible compositions | 0.16 |
| Stability | Resistance to perturbation and later evidence updates | 0.14 |
| Alignment utility | Utility for later conceptual articulation and comparison | 0.10 |

Figure 2 depicts the neighborhood in abstract form. The figure is intentionally generic so that the chapter explains the geometry of the method rather than one domain-specific example. What matters is that the neighborhood contains more than a list of competing theories. It also contains the transformation family `Mi` and the observer-relative equivalence classes `Ei`, so categorical local rewriting and structural compatibility remain explicit [DUVAL-2011]. The consequence profile `Qi` then separates robust consequences from theory-sensitive ones across the retained frontier.

![Neighborhood structure](assets/figure-2-neighborhood.svg)
*Figure 2. The local neighborhood links observational hypotheses, retained theories, transformation families, and consequence profiles without collapsing them into one undifferentiated state.*

The frontier rule is the point where meta-rationality becomes operational. A theory survives the strict frontier only if no other theory is at least as good on every named score dimension and strictly better on at least one of them. The current implementation then applies one rescue rule: if a whole domain would disappear from the strict frontier, but its best surviving theory is still within a small total-score tolerance of the best frontier score, that best theory is reintroduced. The resulting frontier remains bounded, yet it does not erase still-plausible local families merely because one nearby candidate currently ranks first.

## Worked example

Consider the generic prefix: "The item was logged and placed in the staging area. A label was attached and the record was updated." At this point the rich observer sees generic workflow cues but no decisive package, sample, or manuscript marker. The induced frontier therefore keeps package, manuscript, and sample theories alive, even though the package family currently ranks first. This is the intended behavior: the frontier records that the text is still compatible with several local explanations.

The best next question asks for dispatch evidence because that cue would separate package-like theories from the other two families. If the observed answer is "no", the update does not restart the analysis from scratch. It applies a local frontier revision: package-oriented theories lose predictive adequacy and stability, the package family drops out, and the frontier contracts to a smaller manuscript/sample region. The point of the example is not that one question must finish induction. The point is that uncertainty is reduced by an explicit, typed intervention on a retained neighborhood.

## Core algorithms

The operational loop is intentionally split into three algorithms because the framework treats extraction, neighborhood construction, and evidence revision as different epistemic acts. The first step lifts a report into auditable observations. The second step expands those observations into a local theory neighborhood with explicit scores, transformations, and equivalence classes. The third step revises that neighborhood when new evidence arrives. Keeping these stages separate makes it possible to inspect where uncertainty is introduced, where it is reduced, and where it is intentionally retained.

`OBSERVATIONAL_LIFT` is the gate from report space into structured evidence. Its role is not to force one premature interpretation, but to preserve several bounded observational candidates together with provenance and inference strength. That is why the output is `O(x)` rather than a single canonical graph: later stages need to know which distinctions were explicit in the text and which were only inferred under current observer assumptions.

```text
OBSERVATIONAL_LIFT(x, B)
Input:
  x = natural-language report
  B = resource budget
Output:
  O = {O0, ..., On} observational hypotheses

1. Normalize the report and extract explicit typed cues.
2. Infer additional cues through local cue-completion rules.
3. Compute domain-support values from generic, explicit, and inferred signal.
4. Build the base hypothesis O0 with full provenance and cue typing.
5. Build focused hypotheses for the domains that remain within the budgeted support band.
6. Return the bounded family O.
```

In practice this means the lift stage already constrains later theory search. A theory can only claim support from evidence that has a traceable observational path, and hypothetical or inferred elements remain marked instead of masquerading as observed fact. The bounded family keeps the process finite without pretending that early evidence uniquely determines the case.

`LOCAL_RULIAL_EXPLORATION` starts from each retained observational hypothesis and asks which local theories remain structurally compatible with it. This is the point where the framework stops behaving like a labeler and starts behaving like a neighborhood explorer. Refinement, coarsening, and refactorization generate nearby alternatives, while the decomposed score profile explains why some alternatives remain useful even when they are not top-ranked on every dimension.

```text
LOCAL_RULIAL_EXPLORATION(O, Q, B)
Input:
  O = observational hypotheses
  Q = observer/query family
  B = resource budget
Output:
  N = family of local rulial neighborhoods

1. For each observational hypothesis Oi:
2.     Induce one base theory for each active domain family.
3.     Generate nearby theories by refinement, coarsening, and refactorization.
4.     Score every theory on the six named dimensions and compute its total.
5.     Build observer-relative equivalence classes from visible cues and visible states.
6.     Compute robust consequences and theory-sensitive consequences.
7.     Retain a bounded frontier using non-domination plus domain rescue.
8. Return N.
```

The crucial point is that equivalence classes and frontier rescue are not cosmetic additions. Equivalence classes prevent the frontier from being cluttered with theories that differ internally but answer the current questions in the same way. Rescue prevents the strict Pareto rule from erasing an entire family when it is still close enough to remain explanatory under the current evidence.

`RULIAL_NEIGHBORHOOD_UPDATE` governs what happens after the system receives a new answer, a new observation, or a later workflow prefix. The update is not a complete restart. It is a controlled revision of the already retained neighborhood: the best discriminating question is chosen by information gain, answer-dependent score deltas are applied, the frontier is re-summarized, and the new neighborhood can explain exactly why a family was refined, rescued, or removed.

```text
RULIAL_NEIGHBORHOOD_UPDATE(N_t, DeltaE, Q, B)
Input:
  N_t    = current local neighborhoods
  DeltaE = new evidence or answered question
  Q      = observer/query family
  B      = resource budget
Output:
  N_t+1  = updated neighborhoods

1. Select the highest-information-gain question over the current frontier when a question is available.
2. Apply answer-dependent score deltas to the retained theories.
3. Recompute the frontier under non-domination and domain rescue.
4. Rebuild equivalence classes and robust/theory-sensitive consequences.
5. Update theory and domain entropies.
6. Return N_t+1.
```

This distinction matters for engineering use. A restart-based pipeline can tell the user only that the answer changed. An update-based frontier can show which part of the neighborhood became untenable, which distinctions collapsed into equivalence, and which theory became newly dominant because a previously missing cue was supplied. The frontier is therefore not only a data structure. It is the operational form of epistemic restraint inside the framework.
