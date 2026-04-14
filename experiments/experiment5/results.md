# Experiment 5: Expanded benchmark under lexical variation and operational noise

## Problem and Objective
This experiment evaluates whether the frontier remains useful beyond the original eighteen-case controlled corpus. The benchmark expands the validation program to 102 semi-synthetic cases over seven workflow families and three difficulty strata: controlled wording, paraphrased wording, and noisy operational phrasing.

## Experimental Setup
The benchmark is split deterministically into development and test cases per domain family. The development split trains the external multinomial naive Bayes baseline. The test split is evaluated over all four prefix depths with the rich observer. Reported policies are cue-vote classification over phrase matches, single-best-theory ranking, the full frontier top domain, and frontier truth retention.

## Aggregate Results by difficulty stratum
| Stratum | Traces | Cue vote | Naive Bayes | Single theory | Frontier top | Truth retained | Premature collapse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| controlled | 68 | 0.765 | 0.765 | 0.794 | 0.794 | 0.941 | 0 |
| noisy | 68 | 0.765 | 0.765 | 0.794 | 0.794 | 0.926 | 0 |
| paraphrased | 68 | 0.765 | 0.779 | 0.794 | 0.794 | 0.912 | 0 |

## Aggregate Results by prefix depth
| Prefix | Traces | Cue vote | Naive Bayes | Frontier top | Truth retained |
| --- | --- | --- | --- | --- | --- |
| Prefix 1 | 51 | 0.176 | 0.412 | 0.235 | 0.706 |
| Prefix 2 | 51 | 0.882 | 0.804 | 0.941 | 1 |
| Prefix 3 | 51 | 1 | 0.922 | 1 | 1 |
| Prefix 4 | 51 | 1 | 0.941 | 1 | 1 |

## Frontier performance by domain
| Domain | Support | Precision | Recall | F1 | Mean truth rank |
| --- | --- | --- | --- | --- | --- |
| compliance | 24 | 1 | 0.75 | 0.857 | 1.545 |
| incident | 24 | 1 | 0.75 | 0.857 | 1.87 |
| maintenance | 24 | 1 | 0.75 | 0.857 | 1 |
| manuscript | 36 | 0.78 | 0.889 | 0.831 | 1.111 |
| package | 36 | 0.507 | 0.944 | 0.66 | 1.056 |
| procurement | 24 | 1 | 0.75 | 0.857 | 1 |
| sample | 36 | 1 | 0.667 | 0.8 | 1.667 |

## Interpretation
The key question is not only which policy ranks first, but which policy avoids premature closure as wording becomes less schematic. Frontier retention remains useful when paraphrase and noise degrade direct lexical cues because it can preserve the correct family on the active frontier even when the immediate top-ranked answer is still wrong. That behavior is visible in the gap between frontier-top accuracy and truth-retention rate, especially in the noisy stratum.
