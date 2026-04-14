# Experiment 6: Open-set novelty and false-closure control

## Problem and Objective
This experiment tests whether the frontier reacts sanely when the observed workflow does not belong to the active benchmark families. The goal is not full novel-theory induction. The goal is disciplined uncertainty: wide enough frontiers, explicit questions, and low false closure under unseen and hybrid cases.

## Aggregate results by novelty condition
| Condition | Traces | Open-set flag | False closure | Questions | Entropy |
| --- | --- | --- | --- | --- | --- |
| hybrid | 12 | 0.417 | 0 | 0.417 | 0.527 |
| in-domain | 153 | 0.052 | 0 | 0.052 | 0.073 |
| open-set | 30 | 0.533 | 0 | 0.533 | 0.847 |

## Aggregate novelty response by prefix depth
| Prefix | Traces | Open-set flag | False closure | Entropy |
| --- | --- | --- | --- | --- |
| Prefix 2 | 14 | 0.929 | 0 | 1.596 |
| Prefix 3 | 14 | 0.357 | 0 | 0.433 |
| Prefix 4 | 14 | 0.214 | 0 | 0.237 |

## Interpretation
Strong performance here means the framework resists confident misclassification on unseen material and instead keeps uncertainty explicit. If the open-set flag rises on novelty cases without rising excessively on in-domain cases, the frontier is behaving as a healthy commitment control rather than as a forced classifier.
