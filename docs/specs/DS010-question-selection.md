# DS010 - Question Selection and Budget Semantics

## Introduction
This specification isolates the part of the framework that decides when a question is worth asking and how a finite question budget is consumed. The goal is not generic active learning. The goal is bounded contraction of a retained theory frontier without confusing domain uncertainty with the internal multiplicity of local theory variants.

## Core Content
Question scoring is defined over the retained **domain distribution**, not over the raw count of frontier theories. The retained frontier may contain several theories from different observational hypotheses, but question utility is evaluated against the normalized domain mass induced by that frontier. This keeps the question stage aligned with the operational decision problem: which domain families remain plausible, and which question best separates them.

For each candidate question `q`, the library records:

| Field | Meaning |
| --- | --- |
| `answerMap` | deterministic map from domain family to expected answer |
| `answerClasses` | set of answer labels actually present on the current frontier |
| `answerPartitions` | per-answer partition of retained domain families together with their normalized mass |
| `priorEntropy` | entropy of the retained domain distribution before the question |
| `expectedEntropy` | answer-weighted residual domain entropy after the question |
| `informationGain` | `priorEntropy - expectedEntropy` |

The entropy summary is therefore

`H(F) = - sum_d p(d) log p(d)`

where `p(d)` is the retained-domain mass, and

`IG(q) = H(F) - sum_a P(a | q) H(F | a)`

where `a` ranges over the induced answer classes. The selector chooses the question with maximal information gain under the current retained frontier.

Budget semantics must remain explicit. `B_query = N` means the caller permits **up to N answered discriminating questions**. A budget unit is consumed when a concrete answer is applied to the frontier and the neighborhood is rebuilt. Merely listing candidate questions does not consume budget.

The current public usage surface must serialize the question state explicitly. Canonical CNL therefore includes `QUESTION`, `QUESTION_CLASS`, `QUESTION_ANSWER`, and `QUESTION_PARTITION` lines before an answer is applied, and `UPDATE`, `FRONTIER_RETAIN`, `FRONTIER_DROP`, and `FRONTIER_ADD` lines after an answer-driven revision.

The adversarial questioning condition used in Experiment 7 must also stay fixed and documented. The current policy is a **worst-branch adversary**: for each step it chooses the answer that most damages correctness and truth retention, breaking ties by preferring higher residual entropy and stronger misleading confidence.

## Conclusion
Questioning is part of the deterministic symbolic core. It is not a fallback prompt mechanism. Its job is to turn retained plural explanations into an explicit, auditable revision path under a finite answer budget.

### Critical Implementation Directives
1. Compute question entropy and information gain over retained-domain mass, not over raw frontier-theory count.
2. Serialize domain answer maps and answer partitions in the canonical CNL surface.
3. Treat a question budget as a count of answered frontier updates, and keep adversarial-answer semantics fixed in experiment documentation.
