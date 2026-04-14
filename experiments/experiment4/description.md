# Experiment 4 Description

## Goal
Measure whether the retained frontier depends on a narrow hand-tuned parameter point or on a single structural shortcut in the current symbolic core.

## Dataset
The study uses the expanded benchmark test split derived from the seven-domain benchmark. Every case is evaluated at prefix depths 2, 3, and 4 so the analysis focuses on traces where typed evidence has started to appear but ambiguity management still matters.

## Procedure
The experiment runs a deterministic baseline, a suite of structural ablations, and a sampled neighborhood of nearby policy configurations. The ablations remove or weaken observer richness, inferred cues, domain rescue, equivalence-class compression, alignment utility, or discriminating questions. The sampled region perturbs support weights, score weights, and rescue tolerance around the default policy. Each run records top-domain accuracy, truth-retention rate, frontier entropy, frontier width, premature-collapse rate, and agreement with the baseline ranking.

## Interpretation target
This is a robustness test. A strong result is not perfect invariance. A strong result is that the qualitative ordering of conclusions survives across a broad nearby region and that structural ablations reveal which mechanisms actually sustain truth retention and collapse control.

## Authoritative outputs
The authoritative outputs are `summary.json`, `ablations.csv`, `sensitivity-samples.csv`, `ablation-effects.svg`, `policy-sensitivity.svg`, and the derived `results.md` report.
