# DS002 - Data Model

## Introduction
This specification defines the formal objects that make the framework auditable. The point of the data model is not serialization convenience. The point is to preserve, in explicit objects, the difference between evidence, observation, local theory, neighborhood geometry, and retained commitment. If those objects are underspecified, the architecture collapses back into opaque text-to-label behavior.

## Core Content
The framework revolves around four explicit objects.

| Object | Role | Current operational form |
| --- | --- | --- |
| `O(x)` | Observational family for report `x` | Serializable observational hypotheses with cues, support, ambiguity, and provenance |
| `T(Oi, d)` | Local theory for hypothesis `Oi` and domain family `d` | State schema, invariants, rewrite templates, composition discipline, and named score profile |
| `N(Oi)` | Local neighborhood around one observational hypothesis | Retained theories, local transforms, equivalence classes, robust consequences, and question candidates |
| `F` | Active frontier | Bounded subset of theories retained after non-domination and rescue |

The observational family for a report `x` is `O(x) = {O0, O1, ..., On}`. In the current implementation each observational hypothesis stores normalized source text, tokenization, explicit cues, inferred cues, a `supportByDomain` map, ambiguity notes, a confidence profile, and an optional `focusDomain`. A cue is the smallest typed unit that can later affect theory induction. Every cue records its identifier, cue type, specificity, weight, visibility policy, supporting source spans, and whether it was explicit or inferred.

The current lift policy is parameterized but has a stable default. Domain support is computed as

`support(d) = w_g * genericSignal + explicitSignal(d) + w_i * inferredSignal(d)`

with default weights `w_g = 0.3` and `w_i = 0.7`. The hypothesis budget is governed by two lift parameters: `focusRatio = 0.6` and `ambiguityRatio = 0.75`. Operationally, the base hypothesis `O0` keeps all detected cues, while focused hypotheses retain generic cues plus cues of domains whose support remains close enough to the best support under the current budget policy. This is the first bounded budget object of the system, written here as `B_lift`.

For a retained observational hypothesis `Oi` and a domain bundle `d`, the induced local theory is

`T(Oi, d) = (Sigma, I, R, C, S)`

where `Sigma` is the state schema, `I` is the invariant set, `R` is the typed rewrite family, `C` is the composition discipline, and `S` is the named score profile. The current score profile is fully operational. Let `genericNorm`, `domainNorm`, `inferenceNorm`, `sequenceCoverage`, `supportShare`, and `focusBonus` be the normalized generic signal, explicit domain signal, inferred domain signal, matched state-sequence coverage, domain-support share, and focus bonus. The named dimensions are:

- `evidenceCoverage = clamp(0.3 * genericNorm + 0.7 * domainNorm)`
- `predictiveAdequacy = clamp(0.45 * sequenceCoverage + 0.35 * domainNorm + 0.2 * inferenceNorm)`
- `compressionUtility = clamp(0.5 + 0.15 * genericNorm + 0.2 * supportShare + 0.15 * sequenceCoverage - 0.05 * (1 - sequenceCoverage))`
- `compositionalSharpness = clamp(0.45 * sequenceCoverage + 0.3 * domainNorm + 0.15 * focusBonus + 0.1 * supportShare)`
- `stability = clamp(0.45 + 0.2 * genericNorm + 0.15 * sequenceCoverage + 0.15 * supportShare - 0.1 * (1 - supportShare))`
- `alignmentUtility = clamp(0.45 * domainNorm + 0.2 * focusBonus + 0.2 * inferenceNorm + 0.15 * supportShare)`

The weighted scalar total is used only for ranking and entropy summaries. It does not replace the named dimensions:

`total = 0.22 * evidenceCoverage + 0.28 * predictiveAdequacy + 0.10 * compressionUtility + 0.16 * compositionalSharpness + 0.14 * stability + 0.10 * alignmentUtility`

Those weights are also configurable through the analysis policy. Experiment 4 now stress-tests nearby weight regions and reports how far conclusions move under those perturbations.

The local neighborhood around one observational hypothesis is

`N(Oi) = (Ti, Mi, Ei, Qi, Q)`

where `Ti` is the expanded retained theory family, `Mi` is the local move set, `Ei` is the observer-relative equivalence-class family, `Qi` is the consequence profile, and `Q` is the question family currently available over that frontier. In the current implementation `Ti` includes each base theory plus nearby `refined`, `coarsened`, and `refactorized` variants. `Mi` records those typed moves explicitly. `Ei` groups theories that remain indistinguishable under the currently visible cues and visible state sequence. `Qi` splits into robust consequences, defined as invariant intersections across the retained frontier, and theory-sensitive consequences, defined as the invariant remainder of each retained theory. `Q` is the family of discriminating questions supplied by the active domain bundles and filtered through the current frontier.

The second budget object is the frontier budget `B_frontier`. The strict frontier is the set of non-dominated theories under the six named score dimensions. Theory `A` dominates theory `B` when every score dimension of `A` is at least the corresponding dimension of `B` and at least one dimension is strictly greater. The practical frontier is then widened by a rescue rule. If an entire domain disappears from the strict frontier but its best surviving theory is within rescue tolerance `tau_rescue = 0.08` of the best strict-frontier score, that best theory is reintroduced. The current frontier is then capped by the active frontier budget, which defaults to eight retained theories. The rescue rule is what keeps delayed commitment operational rather than merely rhetorical.

The third budget object is the question budget `B_query`, which is external to a single analysis call but explicit in the questioning experiments. A `DiscriminatingQuestion` stores a prompt, an answer map by domain, the induced answer partition over the frontier, and expected information gain. Let `p(d)` be the normalized retained-domain distribution induced by frontier totals. The domain entropy is

`H(F) = - sum_d p(d) log p(d)`

and the information gain of a question `q` is

`IG(q) = H(F) - sum_a P(a | q) H(F | a)`

where `a` ranges over the possible answers induced by the domain answer map. The selector chooses the question with maximal `IG(q)` under the current frontier. `RULIAL_NEIGHBORHOOD_UPDATE` then applies answer-dependent score deltas, rebuilds the frontier, recomputes equivalence classes and consequence profiles, and refreshes theory and domain entropy.

Alignment has one precise operational role in the current implementation. It is not a hidden ontology matcher and it is not a late-stage rewrite of the symbolic result. Alignment utility is one named score dimension that estimates how well a retained theory could later be compared, articulated, or translated into a conceptual repertoire. When the alignment feature is disabled, that utility is removed from the weighted ranking but the canonical frontier object is otherwise preserved.

The stable external serialization of these objects is the canonical CNL surface. Source context, observations, hypotheses, theories, transforms, equivalence classes, score lines, questions, updates, and frontier membership are serialized as deterministic keyword-led lines. The CNL is therefore a stable projection of the same objects described here, not a parallel representation layer invented for documentation.

## Conclusion
The data model is the backbone of the framework because it keeps theory management inspectable. The same objects govern library APIs, experiment artifacts, and article claims, which is why downstream prose can stay close to the actual mechanism instead of inventing a second narrative ontology.

### Critical Implementation Directives
1. Keep named score dimensions, rescue tolerance, equivalence classes, question families, and update deltas explicit in machine-readable outputs.
2. Treat `B_lift`, `B_frontier`, and `B_query` as distinct budget concepts even when they are configured by different parts of the current implementation.
3. Preserve the canonical CNL projection as a stable audit surface for the same underlying objects.
