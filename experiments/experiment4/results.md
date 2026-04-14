# Experiment 4: Sensitivity analysis and structural ablations

## Problem and Objective
This experiment tests whether the current frontier behavior depends on a narrow hyperparameter point or on a single structural shortcut. It runs deterministic ablations over the main symbolic components and then samples nearby policy configurations around the default support, rescue, and scoring weights.

## Structural ablations
| Condition | Accuracy | Truth retained | Premature collapse | Agreement |
| --- | --- | --- | --- | --- |
| Baseline policy | 0.98 | 1 | 0 | 1 |
| Coarse observer | 0.614 | 0.922 | 0 | 0.634 |
| No inferred cues | 0.98 | 1 | 0 | 1 |
| Frontier limit 4 | 0.98 | 0.98 | 0.02 | 1 |
| Frontier limit 12 | 0.98 | 1 | 0 | 1 |
| No domain rescue | 0.98 | 0.98 | 0.02 | 1 |
| No equivalence classes | 0.98 | 1 | 0 | 1 |
| No alignment utility | 0.98 | 1 | 0 | 1 |
| No discriminating questions | 0.98 | 1 | 0 | 1 |

## Sampled policy region
| Sample | Accuracy | Truth retained | Agreement | Entropy |
| --- | --- | --- | --- | --- |
| Sample 1 | 0.98 | 1 | 1 | 0.073 |
| Sample 2 | 0.98 | 1 | 1 | 0.08 |
| Sample 3 | 0.98 | 1 | 1 | 0.049 |
| Sample 4 | 0.98 | 1 | 1 | 0.049 |
| Sample 5 | 0.98 | 1 | 1 | 0.064 |
| Sample 6 | 0.98 | 1 | 1 | 0.048 |
| Sample 7 | 0.98 | 1 | 1 | 0.049 |
| Sample 8 | 0.98 | 1 | 1 | 0.049 |
| Sample 9 | 0.98 | 1 | 1 | 0.12 |
| Sample 10 | 0.98 | 1 | 1 | 0.049 |

## Interpretation
The important result is whether performance remains in a broad neighborhood rather than only at a single hand-tuned point. Structural ablations show which mechanisms carry most of the load for frontier truth retention and premature-collapse control. The sampled policy region then tests whether nearby settings preserve the qualitative ranking of conclusions.
