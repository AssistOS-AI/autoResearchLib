# Experiment 5 Description

## Goal
Measure whether the frontier remains useful on a substantially larger and more lexically varied benchmark than the original controlled corpus, and compare it with external baseline policies.

## Dataset
The study uses a deterministic seven-domain benchmark with controlled, paraphrased, and noisy strata. The benchmark contains development and test splits per domain family, and each test case is evaluated at all four prefix depths.

## Procedure
The full frontier pipeline is evaluated against three simpler comparison policies: cue-vote lexical classification, multinomial naive Bayes, and single-best-theory ranking. Each trace records top-domain accuracy, truth-retention rate, frontier entropy, frontier width, question availability, premature-collapse rate, and calibration summaries.

## Interpretation target
This is a transfer and benchmark test. The question is not only whether the frontier ranks the correct domain first, but whether it preserves the correct family more reliably than simpler alternatives once wording becomes paraphrastic or operationally noisy.

## Authoritative outputs
The authoritative outputs are `summary.json`, `stratum-summary.csv`, `trace-details.csv`, `benchmark-accuracy.svg`, `benchmark-prefix-transfer.svg`, and the derived `results.md` report.
