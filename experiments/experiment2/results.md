# Experiment 2: Discriminating Questions and Frontier Update

## Problem and Objective
This experiment tests whether the library can identify a useful follow-up question when several local theories remain plausible after observational lifting and theory induction.

## Experimental Setup
Only ambiguous cases are retained. For each case, the experiment records the frontier before questioning, asks the highest-information-gain question proposed by the library, applies the gold answer from the case metadata, and recomputes the frontier. Aggregate reporting is grouped by prefix depth.

## Aggregate Results
The following table reports aggregate entropy, accuracy, and information-gain changes after the selected discriminating question is applied.

| Prefix | Cases | Entropy Before | Entropy After | Accuracy Before | Accuracy After | Information Gain |
| --- | --- | --- | --- | --- | --- | --- |
| Prefix 2 | 23 | 1.244 | 0.652 | 0.348 | 0.652 | 0.914 |
| Prefix 3 | 3 | 1.239 | 0.333 | 0.667 | 1 | 0.912 |

## Interpretation
When the observer still leaves multiple theories on the active frontier, the best next question often probes the domain marker that is missing from the current prefix. Answering that question reduces entropy sharply and either isolates the correct domain or collapses the frontier to a much smaller equivalence class. The effect is strongest in mid-prefix cases where procedural structure is visible but domain-specific confirmation is still missing.
