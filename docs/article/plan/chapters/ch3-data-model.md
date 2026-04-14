# 3. Formal objects, budgets, and update rules

The framework revolves around four explicit objects. `O(x)` stores observational hypotheses derived from a report. `T(Oi, d)` stores a local theory for one observational hypothesis and one domain family. `N(Oi)` stores the local neighborhood around that hypothesis, including nearby theories, typed transforms, equivalence classes, consequence profiles, and question candidates. `F` stores the active frontier. The point of these objects is practical: every transition from report to retained theory remains inspectable.

An observational hypothesis is already structured rather than rhetorical. It stores normalized source text, explicit and inferred typed cues, a domain-support map, ambiguity notes, and provenance. The same state is exposed through a canonical CNL projection, so the library surface, the experiment outputs, and the article all refer to the same operational objects rather than to separate descriptive layers.

Three budget objects control how much structure is retained at each stage. `B_lift` governs which focused hypotheses survive observational lifting. `B_frontier` governs how many theories remain on the retained frontier after non-domination and rescue. `B_query` governs how many questioning steps the caller is willing to spend after the initial frontier has been built. Keeping these budgets distinct matters because early observational plurality, retained theory plurality, and question-driven revision are different epistemic acts.

For each retained hypothesis and each active domain family, the system induces a local theory with six named score dimensions: `evidenceCoverage`, `predictiveAdequacy`, `compressionUtility`, `compositionalSharpness`, `stability`, and `alignmentUtility`. The weighted scalar total used for ranking is `0.22 * evidenceCoverage + 0.28 * predictiveAdequacy + 0.10 * compressionUtility + 0.16 * compositionalSharpness + 0.14 * stability + 0.10 * alignmentUtility`. The total matters for ranking and entropy summaries, but it does not replace the named dimensions because several retained theories can remain useful for different reasons.

Table 2 summarizes the operational meaning of the score dimensions.

| Score dimension | Meaning in the current implementation | Weight |
| --- | --- | --- |
| `evidenceCoverage` | Fraction of the observational signal explained by the theory | 0.22 |
| `predictiveAdequacy` | Compatibility with the matched local state evolution | 0.28 |
| `compressionUtility` | Structured summary value without gratuitous local complexity | 0.10 |
| `compositionalSharpness` | Clarity of typed rewrites and admissible compositions | 0.16 |
| `stability` | Resistance to perturbation and later updates | 0.14 |
| `alignmentUtility` | Utility for later conceptual articulation and comparison | 0.10 |

Figure 2 depicts the neighborhood in abstract form. The important point is that the neighborhood contains more than a list of candidate theories. It also contains the transform family `Mi`, the observer-relative equivalence classes `Ei`, the consequence profile `Qi`, and the active question family over the current frontier. Typed local transformation and compatibility therefore remain explicit as part of a categorical rewriting view rather than being hidden in a monolithic score [DUVAL-2011].

![Neighborhood structure](assets/figure-2-neighborhood.svg)
*Figure 2. The local neighborhood links observational hypotheses, retained theories, transform families, equivalence classes, consequence profiles, and question candidates without collapsing them into one undifferentiated state.*

The frontier is summarized with entropy over the retained domain distribution, `H(F) = - sum_d p(d) log p(d)`, where `p(d)` is the normalized retained-domain mass [SHANNON-1948]. Discriminating questions are then selected by expected information gain, `IG(q) = H(F) - sum_a P(a | q) H(F | a)`, which is the reduction in frontier uncertainty expected from asking question `q` [SETTLES-2009]. The practical frontier is also widened by one rescue rule: if an entire domain disappears from the strict frontier but its best theory remains within rescue tolerance `tau_rescue = 0.08` of the best strict-frontier score, that theory is reintroduced. Rescue is therefore the operational safeguard against premature elimination of a still-plausible local family.

Alignment has one precise role in the current implementation. It is a score dimension that estimates how useful a retained theory would be for later conceptual articulation or comparison against an external repertoire. It is not a hidden ontology matcher and it is not a late-stage LLM rewrite of the symbolic result. When alignment is disabled, only that utility contribution is removed from ranking; the canonical frontier object remains intact.

The worked example from Chapter 1 now becomes operational. After the prefix "The item was logged, labeled, and the record was updated," the rich observer sees generic workflow signal but no decisive package, sample, manuscript, procurement, maintenance, incident, or compliance cue. The retained frontier therefore keeps several domain families alive even if one of them is currently ranked first. That is the intended behavior. The system is recording structured uncertainty rather than pretending the case is already resolved.

If the best next question asks for dispatch evidence and the observed answer is "no," the update does not restart the analysis from scratch. It applies a local frontier revision. Package-oriented theories lose predictive adequacy and stability, the frontier contracts, and the surviving neighborhood becomes smaller and sharper. The value of the question is therefore not only a better answer. It is an explicit record of which retained possibilities were ruled out and why.

The same logic is visible in the three core algorithms.

```text
OBSERVATIONAL_LIFT(x, B_lift)
1. Normalize the report and extract explicit typed cues.
2. Infer additional bounded cues through local completion rules.
3. Compute domain support values.
4. Build the base hypothesis with full provenance.
5. Build focused hypotheses that remain within the lift budget.
6. Return O(x).
```

```text
LOCAL_RULIAL_EXPLORATION(O, Q, B_frontier)
1. Induce one base theory for each active domain family.
2. Generate nearby variants by refinement, coarsening, and refactorization.
3. Score theories on the six named dimensions.
4. Build equivalence classes and consequence profiles.
5. Retain the frontier through non-domination plus rescue.
6. Return N(Oi) and F.
```

```text
RULIAL_NEIGHBORHOOD_UPDATE(N_t, DeltaE, Q, B_query)
1. Choose the highest-information-gain question when a question is available.
2. Apply answer-dependent score deltas to retained theories.
3. Recompute the frontier under non-domination and rescue.
4. Rebuild equivalence classes and consequence profiles.
5. Refresh entropies and return N_t+1.
```

The frontier is therefore not only a data structure. It is the operational form of epistemic restraint inside the framework. It records why several explanations survive, why some collapse, and how later evidence changes that balance without hiding the transition.
