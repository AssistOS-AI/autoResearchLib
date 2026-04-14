# Experiment 6 Description

## Goal
Measure whether the retained frontier reacts sanely when the observed trace does not belong to the active benchmark families, with an emphasis on open-set warning behavior and false-closure control.

## Dataset
The study combines six novelty cases with the expanded benchmark test split. The novelty portion includes genuinely unseen domain families and hybrid cases that intentionally mix structures from several known families.

## Procedure
Every case is evaluated at prefix depths 2, 3, and 4 with the rich observer. The experiment applies the novelty-risk assessor to the retained frontier and records open-set warnings, false-closure risk, entropy, frontier width, uncertainty score, top confidence, and question availability.

## Interpretation target
This is an uncertainty-management test rather than a proof of novel theory synthesis. A strong result is that unseen material triggers wider frontiers, higher uncertainty, and more explicit questions without causing the same warning profile on ordinary in-domain traces.

## Authoritative outputs
The authoritative outputs are `summary.json`, `group-summary.csv`, `trace-details.csv`, `novelty-response.svg`, `novelty-prefix-response.svg`, and the derived `results.md` report.
