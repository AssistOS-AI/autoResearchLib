# Experiment 1: Observer Families and Frontier Entropy

## Problem and Objective
This experiment tests whether a richer observer family constrains the local theory frontier earlier than a coarse observer that mostly tracks generic workflow signal.

## Experimental Setup
The dataset contains 18 workflow cases distributed across the domains `package`, `sample`, and `manuscript`. Each case is revealed through four prefixes. For every prefix, the library is executed with the `coarse` observer and with the `rich` observer. The recorded metrics are top-domain accuracy, frontier entropy over the retained domain distribution, equivalence compression, and whether a discriminating question remains available.

## Mean Domain Accuracy
The following table reports mean top-domain accuracy by prefix depth and observer family.

| Prefix | Observer | Accuracy |
| --- | --- | --- |
| Prefix 1 | coarse | 0.333 |
| Prefix 1 | rich | 0.444 |
| Prefix 2 | coarse | 0.333 |
| Prefix 2 | rich | 0.833 |
| Prefix 3 | coarse | 0.944 |
| Prefix 3 | rich | 1 |
| Prefix 4 | coarse | 1 |
| Prefix 4 | rich | 1 |

## Mean Frontier Entropy
The following table reports mean frontier entropy for the same prefix and observer combinations.

| Prefix | Observer | Entropy |
| --- | --- | --- |
| Prefix 1 | coarse | 1.255 |
| Prefix 1 | rich | 1.116 |
| Prefix 2 | coarse | 1.245 |
| Prefix 2 | rich | 0.344 |
| Prefix 3 | coarse | 0.138 |
| Prefix 3 | rich | 0.069 |
| Prefix 4 | coarse | 0 |
| Prefix 4 | rich | 0 |

## Interpretation
The coarse observer remains biased toward a generic package-like explanation when the text exposes only broad workflow structure. The rich observer benefits immediately when subtle domain markers appear, which reduces entropy before the process becomes fully explicit. Once overt procedural markers or terminal outcomes arrive, both observers converge, but the richer observer reaches a confident frontier earlier and leaves fewer unresolved equivalence classes.
