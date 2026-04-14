# Experiment 3 Description

## Goal
Measure whether frontier retention remains useful under cue masking and whether it outperforms simpler baselines that collapse early to a single domain or to a single induced theory.

## Dataset
The study uses the full 18-case workflow corpus across package handling, laboratory sample handling, and editorial manuscript processing. Each case is evaluated at prefix depths 2 and 3. Every prefix is tested in a clean form and in a cue-masked form where the most specific domain markers are deterministically rewritten into more generic administrative language.

## Procedure
All runs use the rich observer so the comparison isolates theory management rather than observer blindness. For every trace, the experiment records three prediction policies: a lexical-support baseline over the base observational hypothesis, a single-best-theory baseline over the induced base theories, and the retained-frontier top domain. It also records whether the ground-truth domain remains anywhere on the retained frontier. When a discriminating question is available, the experiment applies the gold answer from the case metadata and measures the resulting recovery in top-domain accuracy.

## Interpretation target
This is a robustness and baseline-comparison test. The relevant question is not whether masking removes all ambiguity. The question is whether the frontier still preserves the correct family often enough to justify delayed commitment, and whether the questioning policy can convert that retained structure into a better final decision.

## Authoritative outputs
The authoritative outputs are `summary.json`, `baseline-summary.csv`, `question-recovery.csv`, `trace-details.csv`, `baseline-accuracy.svg`, `question-recovery.svg`, and the derived `results.md` report.
