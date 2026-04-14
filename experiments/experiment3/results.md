# Experiment 3: Frontier Retention Under Cue Masking

## Problem and Objective
This experiment tests whether delayed commitment remains useful when the most specific domain markers are rewritten into more generic administrative language. The goal is to compare the retained frontier against simpler policies that collapse early to a single domain or a single induced theory.

## Experimental Setup
The full corpus contributes 18 cases at Prefix 2 and Prefix 3, and each trace is evaluated in clean and cue-masked form for a total of 72 analyzed traces. All runs use the rich observer so the comparison isolates theory management rather than observer blindness. The reported policies are a lexical-support baseline over the base observational hypothesis, a single-best-theory baseline over the induced base theories, the immediate top-ranked domain on the retained frontier, the end-to-end frontier result after one question when available, and the retained-frontier truth rate that asks whether the gold domain remains anywhere on the frontier.

## Aggregate Baseline Comparison
The following table reports the aggregate baseline comparison for each condition and prefix depth.

| Condition | Cases | Lexical baseline | Single theory | Frontier top | Frontier + one question | Truth retained on frontier |
| --- | --- | --- | --- | --- | --- | --- |
| Clean P2 | 18 | 0.778 | 0.833 | 0.833 | 0.889 | 1 |
| Masked P2 | 18 | 0.333 | 0.333 | 0.333 | 0.667 | 1 |
| Clean P3 | 18 | 0.944 | 1 | 1 | 1 | 1 |
| Masked P3 | 18 | 0.5 | 0.389 | 0.389 | 0.722 | 1 |

## Question Recovery on Ambiguous Traces
The following table keeps only traces where the retained frontier still exposed a discriminating question.

| Condition | Ambiguous traces | Accuracy before question | Accuracy after question | Rescued by questioning | Entropy before question | Entropy after question |
| --- | --- | --- | --- | --- | --- | --- |
| Clean P2 | 5 | 0.4 | 0.6 | 0.2 | 1.239 | 0.6 |
| Masked P2 | 18 | 0.333 | 0.667 | 0.333 | 1.243 | 0.667 |
| Clean P3 | 1 | 1 | 1 | 0 | 1.239 | 0 |
| Masked P3 | 15 | 0.267 | 0.667 | 0.4 | 1.241 | 0.733 |

## Interpretation
Cue masking produces the clearest separation at Prefix 2. Under masking, the lexical baseline falls to 0.333 and the single-theory baseline to 0.333, while the retained frontier still keeps the correct domain somewhere on the frontier in all masked Prefix 2 traces. That retained structure matters because one question lifts end-to-end accuracy to 0.667 and raises ambiguous-trace accuracy from 0.333 to 0.667.

By Prefix 3 the masked traces become easier but the same pattern remains visible. The retained frontier reaches 0.389 top accuracy, and one question lifts the full pipeline to 0.722 while preserving the correct domain on the frontier in all masked Prefix 3 traces. The main conclusion is therefore not that masking becomes irrelevant. It is that the frontier supplies a disciplined buffer between weak textual evidence and premature commitment, and that the question policy can exploit that buffer when ambiguity persists.
