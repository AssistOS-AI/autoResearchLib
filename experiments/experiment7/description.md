# Experiment 7 Description

## Goal
Measure how useful the retained frontier remains under multi-step questioning budgets, and compare question-selection policies under clean, noisy, and adversarial evidence conditions.

## Dataset
The study uses the paraphrased and noisy strata of the expanded benchmark test split. Each selected case is evaluated at prefix depths 2 and 3, where ambiguity and recoverability are both visible.

## Procedure
For each trace, the experiment runs questioning budgets of 0, 1, 2, and 3 steps. It compares the default information-gain policy with a cheaper top-domain heuristic and a random policy. The study also varies evidence conditions: clean gold answers, masked evidence with noisy answers, and masked evidence with adversarial answers. Each run records final accuracy, truth-retention rate, frontier entropy, number of questions used, and the fraction of initially wrong traces rescued later.

## Interpretation target
This is a recoverability test. The central question is whether explicit questioning produces better accuracy-entropy tradeoffs than random or cheaper heuristic choices, and how sharply performance degrades when answers become noisy or adversarial.

## Authoritative outputs
The authoritative outputs are `summary.json`, `summary.csv`, `trace-details.csv`, `accuracy-vs-budget.svg`, `entropy-vs-budget.svg`, and the derived `results.md` report.
