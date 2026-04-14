# Experiment 7: Multi-step questioning and recoverability

## Problem and Objective
This experiment evaluates whether the frontier supports useful recovery over a question budget of 0, 1, 2, and 3 answered questions. It compares three question policies: information gain, random selection, and a cheaper symbolic top-domain heuristic. The adverse-answer condition uses a worst-branch policy: at each step it chooses the answer that most damages correctness and truth retention, breaking ties by preferring higher post-update entropy and stronger misleading confidence.

## Clean condition
| Policy | Budget | Accuracy | Truth retained | Entropy | Rescued |
| --- | --- | --- | --- | --- | --- |
| information-gain | 0 | 0.971 | 1 | 0.116 | 0 |
| information-gain | 1 | 0.971 | 1 | 0.041 | 0 |
| information-gain | 2 | 1 | 1 | 0.057 | 1 |
| information-gain | 3 | 1 | 1 | 0.019 | 1 |
| random | 0 | 0.971 | 1 | 0.116 | 0 |
| random | 1 | 0.971 | 1 | 0.057 | 0 |
| random | 2 | 0.985 | 1 | 0.049 | 0.5 |
| random | 3 | 1 | 1 | 0.042 | 1 |
| top-domain | 0 | 0.971 | 1 | 0.116 | 0 |
| top-domain | 1 | 0.971 | 1 | 0.041 | 0 |
| top-domain | 2 | 1 | 1 | 0.057 | 1 |
| top-domain | 3 | 1 | 1 | 0.019 | 1 |

## Masked evidence with noisy answers
| Policy | Budget | Accuracy | Truth retained | Entropy | Rescued |
| --- | --- | --- | --- | --- | --- |
| information-gain | 0 | 0.5 | 0.897 | 1.107 | 0 |
| information-gain | 1 | 0.647 | 0.838 | 0.628 | 0.294 |
| information-gain | 2 | 0.691 | 0.824 | 0.534 | 0.382 |
| information-gain | 3 | 0.691 | 0.809 | 0.427 | 0.382 |
| random | 0 | 0.5 | 0.897 | 1.107 | 0 |
| random | 1 | 0.618 | 0.779 | 0.61 | 0.265 |
| random | 2 | 0.588 | 0.706 | 0.498 | 0.235 |
| random | 3 | 0.574 | 0.706 | 0.356 | 0.206 |
| top-domain | 0 | 0.5 | 0.897 | 1.107 | 0 |
| top-domain | 1 | 0.574 | 0.676 | 0.452 | 0.235 |
| top-domain | 2 | 0.603 | 0.676 | 0.408 | 0.294 |
| top-domain | 3 | 0.603 | 0.706 | 0.343 | 0.294 |

## Adverse condition
| Policy | Budget | Accuracy | Truth retained | Entropy | Rescued |
| --- | --- | --- | --- | --- | --- |
| information-gain | 0 | 0.5 | 0.897 | 1.107 | 0 |
| information-gain | 1 | 0.353 | 0.353 | 0.32 | 0 |
| information-gain | 2 | 0.353 | 0.353 | 0.3 | 0 |
| information-gain | 3 | 0.353 | 0.412 | 0.3 | 0 |
| random | 0 | 0.5 | 0.897 | 1.107 | 0 |
| random | 1 | 0.353 | 0.397 | 0.473 | 0 |
| random | 2 | 0.353 | 0.397 | 0.392 | 0 |
| random | 3 | 0.353 | 0.382 | 0.376 | 0 |
| top-domain | 0 | 0.5 | 0.897 | 1.107 | 0 |
| top-domain | 1 | 0.353 | 0.353 | 0.32 | 0 |
| top-domain | 2 | 0.353 | 0.353 | 0.3 | 0 |
| top-domain | 3 | 0.353 | 0.412 | 0.3 | 0 |

## Adversarial failure mechanics
| Policy | Budget | Mean IG | Entropy delta/question | Harmful question rate |
| --- | --- | --- | --- | --- |
| information-gain | 0 | 0 | 0 | 0 |
| information-gain | 1 | 0.631 | 0.787 | 0.647 |
| information-gain | 2 | 0.634 | 0.747 | 0.574 |
| information-gain | 3 | 0.629 | 0.747 | 0.549 |
| random | 0 | 0 | 0 | 0 |
| random | 1 | 0.497 | 0.634 | 0.603 |
| random | 2 | 0.546 | 0.535 | 0.544 |
| random | 3 | 0.543 | 0.5 | 0.51 |
| top-domain | 0 | 0 | 0 | 0 |
| top-domain | 1 | 0.631 | 0.787 | 0.647 |
| top-domain | 2 | 0.634 | 0.747 | 0.574 |
| top-domain | 3 | 0.629 | 0.747 | 0.549 |

## Interpretation
The key curves are accuracy versus question budget, entropy reduction per question, and the fraction of initially wrong traces that become correct later. Under adversarial answers the frontier still contracts, but the failure mode becomes visible: entropy can fall while truth retention falls too. That separates useful contraction from toxic contraction and makes the limitation explicit instead of hiding it behind one aggregate accuracy curve.
