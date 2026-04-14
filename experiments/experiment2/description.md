# Experiment 2 Description

## Goal
Measure whether a discriminating question can reduce frontier entropy and improve domain accuracy when multiple theories remain plausible after analysis.

## Dataset
The study reuses the ambiguous workflow cases from Experiment 1, focusing on prefix depths where at least one discriminating question is still available. The ambiguous subset is deliberately retained because the goal is to test frontier management under residual uncertainty, not to remeasure the easy cases.

## Procedure
For each ambiguous case, the library selects the highest-information-gain question, applies the gold answer from the case metadata, and recomputes the frontier. The experiment records entropy before and after questioning, accuracy before and after questioning, the selected question text, the probed cue, and the resulting information gain.

## Interpretation target
This is a theory-management test rather than a proof of complete disambiguation. The important signal is that the selected question materially shrinks the active frontier and explains how the update happened.

## Authoritative outputs
The authoritative outputs are `summary.json`, `question-effect.csv`, `question-details.csv`, `question-entropy.svg`, `question-accuracy.svg`, and the derived `results.md` report.
