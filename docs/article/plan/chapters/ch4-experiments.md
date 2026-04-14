# 4. Validation ladder and empirical results

The paper now validates a ladder of claims rather than one undifferentiated promise. The early experiments still test the structural core of the framework: richer observation, question-driven frontier contraction, and recoverability under cue masking. The newer experiments then test robustness to policy variation, transfer across a larger benchmark, healthy uncertainty under novelty, and multi-step recoverability under different questioning conditions. This matters because the architecture is broader than the current implementation, and the article should not imply that one experiment settles every aspect of the proposal.

The empirical program now has three dataset layers. The first is the original eighteen-case controlled corpus across package, sample, and manuscript workflows. The second is an expanded seven-domain benchmark with controlled, paraphrased, and noisy strata, yielding 102 benchmark cases and 204 evaluated test traces over four prefix depths. The third is a novelty layer with unseen and hybrid cases evaluated against the same deterministic core. Multi-step questioning then reuses the paraphrased and noisy benchmark slices to test budgeted recovery over time.

Table 3 summarizes the seven experiments and their role in the validation ladder.

| Experiment | Role | Trace count | Main signal |
| --- | --- | --- | --- |
| Experiment 1 | Observer richness | 18 cases × 4 prefixes × 2 observers | Rich observers contract the frontier earlier. |
| Experiment 2 | Single-step questioning | 26 ambiguous traces | One discriminating question lowers entropy and improves ranking. |
| Experiment 3 | Cue masking and recovery | 72 traces | Retained frontiers preserve recoverability under masked cues. |
| Experiment 4 | Sensitivity and ablation | 153 traces | Nearby policy choices preserve conclusions; coarse observation and rescue removal matter. |
| Experiment 5 | Expanded benchmark transfer | 204 traces | Frontier retention transfers across seven domains and three lexical strata. |
| Experiment 6 | Open-set novelty | 195 traces | Novelty increases uncertainty and question demand more than in-domain traces. |
| Experiment 7 | Multi-step questioning | 2448 traces | Clean and noisy recovery improve with budget; adversarial answers remain hard. |

Experiments 1 through 3 still provide the structural foundation. On Prefix 2 traces, the rich observer raises mean top-domain accuracy above the coarse observer while lowering frontier entropy. Single-step questioning then lowers entropy further on the retained ambiguous subset. Under cue masking, the lexical and single-theory baselines collapse early, but the retained frontier still preserves enough structure for one question to recover a substantially better answer. Those three studies establish that the retained frontier is not decorative. It changes what can still be recovered later.

## Experiment 4. Sensitivity analysis and structural ablations

Experiment 4 answers the most immediate skepticism about the symbolic core: do the results depend on one narrow set of constants or on one hidden structural shortcut? The baseline policy is evaluated against ablations that weaken observer richness, inferred cues, domain rescue, equivalence compression, alignment utility, or discriminating questions, and against a sampled neighborhood of nearby policy settings.

Table 4 shows the ablation results. The baseline keeps top accuracy at 0.98 with truth retention at 1. Coarse observation is the strongest degrading ablation: accuracy falls to 0.614 and entropy rises to 0.854. Removing domain rescue keeps top accuracy almost unchanged but lowers truth retention to 0.98 and introduces a non-zero premature-collapse rate.

| Condition | Accuracy | Truth retained | Entropy | Premature collapse | Agreement |
| --- | --- | --- | --- | --- | --- |
| Baseline policy | 0.98 | 1 | 0.073 | 0 | 1 |
| Coarse observer | 0.614 | 0.922 | 0.854 | 0 | 0.634 |
| No inferred cues | 0.98 | 1 | 0.103 | 0 | 1 |
| Frontier limit 4 | 0.98 | 0.98 | 0.031 | 0.02 | 1 |
| Frontier limit 12 | 0.98 | 1 | 0.073 | 0 | 1 |
| No domain rescue | 0.98 | 0.98 | 0 | 0.02 | 1 |
| No equivalence classes | 0.98 | 1 | 0.073 | 0 | 1 |
| No alignment utility | 0.98 | 1 | 0.073 | 0 | 1 |
| No discriminating questions | 0.98 | 1 | 0.073 | 0 | 1 |

Figure 9 shows the structural ablation profile directly, and Figure 10 shows the sampled policy region. Across the sampled neighborhood, top accuracy never drops below 0.98 and agreement with the baseline remains at 1. The result is not that every component is equally important. The result is that the framework is stable across a broad local region while still revealing which structural pieces carry most of the epistemic load.

![Structural ablations on the expanded benchmark](assets/figure-9-ablation-effects.svg)
*Figure 9. Accuracy, truth retention, and premature collapse across the main structural ablations.*

![Policy sensitivity across sampled configurations](assets/figure-10-policy-sensitivity.svg)
*Figure 10. Stability of accuracy, truth retention, and agreement with the baseline across sampled nearby policy configurations.*

## Experiment 5. Expanded benchmark transfer

Experiment 5 broadens the corpus from the original controlled set to a seven-domain benchmark with controlled, paraphrased, and noisy strata. It compares the frontier against cue-vote lexical classification, multinomial naive Bayes, and single-best-theory ranking. Calibration is also reported through expected calibration error to track how confidence matches empirical accuracy [GUO-2017].

Table 5 shows the stratum-level summary. Across all three strata, frontier-top accuracy stays at 0.794 or above, while truth retention remains even higher: 0.941 for controlled wording, 0.912 for paraphrased wording, and 0.926 for noisy wording. The gap between frontier-top accuracy and truth retention is precisely the point: the retained frontier continues to preserve the correct family more often than the immediate top-ranked answer reveals.

| Stratum | Traces | Cue vote | Naive Bayes | Single theory | Frontier top | Truth retained | Frontier ECE |
| --- | --- | --- | --- | --- | --- | --- | --- |
| controlled | 68 | 0.765 | 0.765 | 0.794 | 0.794 | 0.941 | 0.079 |
| noisy | 68 | 0.765 | 0.765 | 0.794 | 0.794 | 0.926 | 0.073 |
| paraphrased | 68 | 0.765 | 0.779 | 0.794 | 0.794 | 0.912 | 0.067 |

Figure 11 compares the main policies across the three strata. The benchmark also shows the expected prefix-depth story: at Prefix 1 the frontier still preserves truth better than it ranks it, while later prefixes let both ranking and retention approach full resolution. This is a stronger empirical basis than the original eighteen-case corpus because the benchmark now includes broader lexical variation, more workflow families, and explicit external baselines.

![Expanded benchmark accuracy by stratum](assets/figure-11-benchmark-accuracy.svg)
*Figure 11. Accuracy and frontier-truth retention across controlled, paraphrased, and noisy benchmark strata.*

## Experiment 6. Open-set novelty and false-closure control

Experiment 6 asks a narrower question than full theory induction: when the trace is genuinely unseen or hybrid, does the frontier behave like a healthy open-set uncertainty mechanism rather than a forced closed-set commitment [SCHEIRER-2013]? The current novelty layer does not synthesize a brand-new theory family. It measures whether novelty increases uncertainty, frontier width, and question demand without producing the same warning profile on ordinary in-domain traces.

Table 6 shows the result. In-domain traces are flagged as open-set candidates only 0.052 of the time, while open-set traces are flagged at 0.533 and hybrid traces at 0.417. Mean entropy rises from 0.073 in-domain to 0.847 on open-set traces. This is the right direction for a commitment-control mechanism.

| Condition | Traces | Open-set flag | False closure | Questions | Entropy |
| --- | --- | --- | --- | --- | --- |
| hybrid | 12 | 0.417 | 0 | 0.417 | 0.527 |
| in-domain | 153 | 0.052 | 0 | 0.052 | 0.073 |
| open-set | 30 | 0.533 | 0 | 0.533 | 0.847 |

Figure 12 shows the same comparison graphically. The strongest novelty response appears at earlier prefixes, where the framework retains wider frontiers and more question demand. Later prefixes can still collapse incorrectly on some unseen cases, which is why the article should describe this as healthy uncertainty management rather than as proof of new local-theory synthesis.

![Novelty response versus in-domain behavior](assets/figure-12-novelty-response.svg)
*Figure 12. Open-set warning rate, false-closure risk, and question availability on in-domain, hybrid, and open-set traces.*

## Experiment 7. Multi-step questioning budgets

Experiment 7 extends the single-step questioning result into an explicit budgeted protocol. The benchmark traces are evaluated under budgets of 0, 1, 2, and 3 questions and under three question policies: information gain, a cheaper top-domain heuristic, and a random policy. The study contrasts clean evidence, masked evidence with noisy answers, and masked evidence with adversarial answers.

Table 7 shows the noisy condition, where the comparison is most useful. Under masked noisy evidence, the information-gain policy raises final accuracy from 0.5 at budget 0 to 0.691 at budget 2, while the random policy reaches only 0.588 at the same budget. Clean evidence reaches full recovery quickly, which confirms that the multi-step protocol is not merely adding redundant queries.

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

Figure 13 shows accuracy versus budget under the hardest adversarial condition, and Figure 14 shows the corresponding entropy curve. The important negative result is visible as well as the positive one: under adversarial answers, all policies degrade sharply after budget 0. Information gain still drives entropy lower than the random policy, but it does not recover accuracy in the same way it does under clean or noisy answers. This is a real current limitation of the implementation, not a rhetorical footnote.

![Accuracy versus question budget under adversarial evidence](assets/figure-13-accuracy-budget.svg)
*Figure 13. Accuracy versus question budget under masked adversarial evidence for information-gain, top-domain, and random questioning policies.*

![Entropy versus question budget under adversarial evidence](assets/figure-14-entropy-budget.svg)
*Figure 14. Entropy versus question budget under masked adversarial evidence. Information-gain questioning still contracts uncertainty more efficiently than the random policy, but adversarial answers remain hard.*

Taken together, the seven experiments support a stronger and more defensible claim than the earlier three-experiment article draft. The current implementation now supports structural validity, local robustness, broader benchmark transfer, healthier uncertainty on novelty cases, and meaningful question-budget effects under clean and noisy evidence. It still does not support full open-ended theory induction, synthesis of new domain families, or robust adversarial multi-step recovery. The optional auditability study defined elsewhere remains future work rather than current evidence, and it should remain described that way.
