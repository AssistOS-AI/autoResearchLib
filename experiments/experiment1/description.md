# Experiment 1 Description

## Goal
Measure how observer richness changes the retained local theory frontier as progressively longer workflow prefixes become available.

## Dataset
The study uses 18 controlled workflow cases across package handling, laboratory sample handling, and editorial manuscript processing. Each case is exposed through four textual prefixes so that the observer sometimes sees only macro-structural workflow language and later sees more specific domain markers.

## Procedure
For every prefix, the library runs once with a coarse observer and once with a rich observer. The coarse observer tracks only generic workflow signal. The rich observer can additionally detect a narrower set of typed domain markers. The experiment records the top-ranked domain, frontier entropy, equivalence compression, question availability, and the full retained distribution over candidate domains.

## Interpretation target
This is a representation test rather than a final-accuracy benchmark. The question is whether richer observation changes the retained neighborhood earlier, not whether the system can guess the correct domain from extremely short text with no relevant cue.

## Authoritative outputs
The authoritative outputs are `summary.json`, `observer-summary.csv`, `case-details.csv`, `observer-accuracy.svg`, `observer-entropy.svg`, and the derived `results.md` report.
