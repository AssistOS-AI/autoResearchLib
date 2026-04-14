# Experiment 6 Description

## Goal
Measure whether the retained frontier reacts sanely when the observed trace does not belong to the active benchmark families, with an emphasis on open-set warning behavior and false-closure control.

## Dataset
The study combines fourteen novelty cases with the expanded benchmark test split. The novelty portion includes genuinely unseen clinical, legal, quality, logistics, and hiring traces together with hybrid cases that intentionally mix structures from several known families.

## Procedure
Every case is evaluated at segment depths 2, 3, and 4 with the rich observer. The experiment applies the novelty-risk assessor to the retained frontier and records open-set warnings, false-closure risk, entropy, frontier width, uncertainty score, top confidence, question availability, and canonical usage metadata. Aggregate outputs now also summarize novelty behavior by unseen family and collect a short failure analysis.

## Interpretation target
This is an uncertainty-management test rather than a proof of novel theory synthesis. A strong result is that unseen material triggers wider frontiers, higher uncertainty, and more explicit questions without causing the same warning profile on ordinary in-domain traces.

## Authoritative outputs
The authoritative outputs are `summary.json`, `group-summary.csv`, `novel-family-summary.csv`, `trace-details.csv`, `failure-analysis.md`, `novelty-response.svg`, `novelty-prefix-response.svg`, and the derived `results.md` report.
