---
chapter: 4
title: Validation ladder and empirical results
target: chapters/ch4-experiments.md
dependsOn:
  - ../../specs/DS003-experimental-protocol.md
  - ../../specs/DS008-expanded-validation.md
  - ../../specs/DS009-auditability-study.md
  - ../../../experiments/experiment1/description.md
  - ../../../experiments/experiment1/results.md
  - ../../../experiments/experiment1/summary.json
  - ../../../experiments/experiment2/description.md
  - ../../../experiments/experiment2/results.md
  - ../../../experiments/experiment2/summary.json
  - ../../../experiments/experiment3/description.md
  - ../../../experiments/experiment3/results.md
  - ../../../experiments/experiment3/summary.json
  - ../../../experiments/experiment4/description.md
  - ../../../experiments/experiment4/results.md
  - ../../../experiments/experiment4/summary.json
  - ../../../experiments/experiment5/description.md
  - ../../../experiments/experiment5/results.md
  - ../../../experiments/experiment5/summary.json
  - ../../../experiments/experiment6/description.md
  - ../../../experiments/experiment6/results.md
  - ../../../experiments/experiment6/summary.json
  - ../../../experiments/experiment7/description.md
  - ../../../experiments/experiment7/results.md
  - ../../../experiments/experiment7/summary.json
  - ./bibliography.md
---

# Plan CH4 - Validation ladder and empirical results

## Chapter Intent
Present the experiments as a staged empirical ladder rather than as a loose collection of plots. The chapter must distinguish what the early structural studies show, what the expanded benchmark and ablations add, what the novelty study does and does not prove, and where multi-step questioning still breaks. The tone should remain sober and protocol-oriented.

## Paragraph Plan

| Paragraph | Source files | Guidance |
| --- | --- | --- |
| P1 | `DS003 Introduction`, `DS008 Introduction` | Open by stating that the paper validates a ladder of claims rather than the whole theory at once. |
| P2 | `DS003 Core Content`, `experiment5/summary.json`, `experiment6/summary.json`, `experiment7/summary.json` | Describe the three dataset layers: original 18-case corpus, expanded 102-case benchmark, and novelty set. |
| P3 | `DS003 Core Content`, all experiment descriptions | Introduce a compact table that summarizes the seven experiments, their role, and their trace counts. |
| P4 | `experiment1/results.md`, `experiment2/results.md`, `experiment3/results.md` | Summarize the structural foundation from Experiments 1–3 without spending the whole chapter there. |
| P5 | `experiment4/description.md`, `experiment4/summary.json`, `experiment4/results.md` | Explain sensitivity and ablation as a direct response to hardcoded-weight criticism. Introduce Table 4 and Figures 9 and 10. |
| P6 | `experiment5/description.md`, `experiment5/summary.json`, `experiment5/results.md` | Explain the expanded benchmark, the external baselines, and calibration. Cite Guo only for calibration language. Introduce Table 5 and Figure 11. |
| P7 | `experiment6/description.md`, `experiment6/summary.json`, `experiment6/results.md` | Explain novelty handling as open-set uncertainty management rather than full new-theory synthesis. Cite Scheirer only for the open-set framing. Introduce Table 6 and Figure 12. |
| P8 | `experiment7/description.md`, `experiment7/summary.json`, `experiment7/results.md` | Explain multi-step questioning budgets, clean and noisy recovery, and the adversarial failure mode. Introduce Table 7 and Figures 13 and 14. |
| P9 | `DS008 Core Content`, `DS009 Core Content` | Close with failure analysis and the optional auditability study as future work rather than current evidence. |

## Generated Chapter Template

# 4. Validation ladder and empirical results

The paper now validates a ladder of claims rather than one undifferentiated promise. The early experiments still test the structural core of the framework: richer observation, question-driven frontier contraction, and recoverability under cue masking. The newer experiments then test robustness to policy variation, transfer across a larger benchmark, healthy uncertainty under novelty, and multi-step recoverability under different questioning conditions. This matters because the architecture is broader than the current implementation, and the article should not imply that one experiment settles every aspect of the proposal.

The empirical program now has three dataset layers. The first is the original eighteen-case controlled corpus across package, sample, and manuscript workflows. The second is an expanded seven-domain benchmark with controlled, paraphrased, and noisy strata, yielding {{JSON:../../../experiments/experiment5/summary.json#benchmarkCaseCount}} benchmark cases and {{JSON:../../../experiments/experiment5/summary.json#traceCount}} evaluated test traces over four segment depths. The third is a novelty layer with {{JSON:../../../experiments/experiment6/summary.json#noveltyCaseCount}} unseen and hybrid base cases evaluated against the same deterministic core. Multi-step questioning then reuses the paraphrased and noisy benchmark slices to test budgeted recovery over time.

Table 3 summarizes the seven experiments and their role in the validation ladder.

| Experiment | Role | Trace count | Main signal |
| --- | --- | --- | --- |
| Experiment 1 | Observer richness | 18 cases × 4 prefixes × 2 observers | Rich observers contract the frontier earlier. |
| Experiment 2 | Single-step questioning | {{JSON:../../../experiments/experiment2/summary.json#caseCount}} ambiguous traces | One discriminating question lowers entropy and improves ranking. |
| Experiment 3 | Cue masking and recovery | {{JSON:../../../experiments/experiment3/summary.json#traceCount}} traces | Retained frontiers preserve recoverability under masked cues. |
| Experiment 4 | Sensitivity and ablation | {{JSON:../../../experiments/experiment4/summary.json#traceCount}} traces | Nearby policy choices preserve conclusions; coarse observation and rescue removal matter. |
| Experiment 5 | Expanded benchmark transfer | {{JSON:../../../experiments/experiment5/summary.json#traceCount}} traces | Frontier retention transfers across seven domains and three lexical strata. |
| Experiment 6 | Open-set novelty | {{JSON:../../../experiments/experiment6/summary.json#traceCount}} traces | Novelty increases uncertainty and question demand more than in-domain traces. |
| Experiment 7 | Multi-step questioning | {{JSON:../../../experiments/experiment7/summary.json#traceCount}} traces | Clean and noisy recovery improve with budget; adversarial answers remain hard. |

Experiments 1 through 3 still provide the structural foundation. On Prefix 2 traces, the rich observer raises mean top-domain accuracy above the coarse observer while lowering frontier entropy. Single-step questioning then lowers entropy further on the retained ambiguous subset. Under cue masking, the lexical and single-theory baselines collapse early, but the retained frontier still preserves enough structure for one question to recover a substantially better answer. Those three studies establish that the retained frontier is not decorative. It changes what can still be recovered later.

## Experiment 4. Sensitivity analysis and structural ablations

Experiment 4 answers the most immediate skepticism about the symbolic core: do the results depend on one narrow set of constants or on one hidden structural shortcut? The baseline policy is evaluated against ablations that weaken observer richness, inferred cues, domain rescue, equivalence compression, alignment utility, or discriminating questions, and against a sampled neighborhood of nearby policy settings.

Table 4 shows the ablation results. The baseline keeps top accuracy at {{JSON:../../../experiments/experiment4/summary.json#ablations[id=baseline].topAccuracy}} with truth retention at {{JSON:../../../experiments/experiment4/summary.json#ablations[id=baseline].truthRetentionRate}}. Coarse observation is the strongest degrading ablation: accuracy falls to {{JSON:../../../experiments/experiment4/summary.json#ablations[id=coarse-observer].topAccuracy}} and entropy rises to {{JSON:../../../experiments/experiment4/summary.json#ablations[id=coarse-observer].meanEntropy}}. Removing domain rescue keeps top accuracy almost unchanged but lowers truth retention to {{JSON:../../../experiments/experiment4/summary.json#ablations[id=no-domain-rescue].truthRetentionRate}} and introduces a non-zero premature-collapse rate.

{{JSON_TABLE:../../../experiments/experiment4/summary.json#ablations|Condition=label;Accuracy=topAccuracy;Truth retained=truthRetentionRate;Entropy=meanEntropy;Premature collapse=prematureCollapseRate;Agreement=agreementWithBaseline}}

Figure 9 shows the structural ablation profile directly, and Figure 10 shows the sampled policy region. Across the sampled neighborhood, top accuracy never drops below {{JSON:../../../experiments/experiment4/summary.json#sensitivitySamples.23.topAccuracy}} and agreement with the baseline remains at {{JSON:../../../experiments/experiment4/summary.json#sensitivitySamples.23.agreementWithBaseline}}. The result is not that every component is equally important. The result is that the framework is stable across a broad local region while still revealing which structural pieces carry most of the epistemic load.

![Structural ablations on the expanded benchmark](assets/figure-9-ablation-effects.svg)
*Figure 9. Accuracy, truth retention, and premature collapse across the main structural ablations.*

![Policy sensitivity across sampled configurations](assets/figure-10-policy-sensitivity.svg)
*Figure 10. Stability of accuracy, truth retention, and agreement with the baseline across sampled nearby policy configurations.*

## Experiment 5. Expanded benchmark transfer

Experiment 5 broadens the corpus from the original controlled set to a seven-domain benchmark with controlled, paraphrased, and noisy strata. It compares the frontier against cue-vote lexical classification, multinomial naive Bayes, and single-best-theory ranking. Calibration is also reported through expected calibration error to track how confidence matches empirical accuracy [GUO-2017].

Table 5 shows the stratum-level summary. Across all three strata, frontier-top accuracy stays at {{JSON:../../../experiments/experiment5/summary.json#summaryByStratum[stratum=controlled].frontierTopAccuracy}} or above, while truth retention remains even higher: {{JSON:../../../experiments/experiment5/summary.json#summaryByStratum[stratum=controlled].frontierRetentionRate}} for controlled wording, {{JSON:../../../experiments/experiment5/summary.json#summaryByStratum[stratum=paraphrased].frontierRetentionRate}} for paraphrased wording, and {{JSON:../../../experiments/experiment5/summary.json#summaryByStratum[stratum=noisy].frontierRetentionRate}} for noisy wording. The gap between frontier-top accuracy and truth retention is precisely the point: the retained frontier continues to preserve the correct family more often than the immediate top-ranked answer reveals.

{{JSON_TABLE:../../../experiments/experiment5/summary.json#summaryByStratum|Stratum=stratum;Traces=traceCount;Cue vote=cueVoteAccuracy;Naive Bayes=naiveBayesAccuracy;Single theory=singleTheoryAccuracy;Frontier top=frontierTopAccuracy;Truth retained=frontierRetentionRate;Frontier ECE=frontierCalibrationEce}}

The benchmark is now instrumented strongly enough to show where transfer is still uneven. Table 5b reports per-domain frontier precision, recall, F1, and mean truth rank. The weakest families remain the ones whose local cues overlap most with adjacent workflow structures, but even there the retained truth rank stays well below full collapse because the correct family usually survives somewhere on the frontier.

{{JSON_TABLE:../../../experiments/experiment5/summary.json#summaryByDomain|Domain=domainId;Support=support;Precision=precision;Recall=recall;F1=f1;Mean truth rank=meanTruthRank}}

Figure 11 compares the main policies across the three strata. The benchmark also shows the expected segment-depth story: at Segment 1 the frontier still preserves truth better than it ranks it, while later stages let both ranking and retention approach full resolution. This is a stronger empirical basis than the original eighteen-case corpus because the benchmark now includes broader lexical variation, more workflow families, explicit external baselines, and domain-level error diagnostics.

![Expanded benchmark accuracy by stratum](assets/figure-11-benchmark-accuracy.svg)
*Figure 11. Accuracy and frontier-truth retention across controlled, paraphrased, and noisy benchmark strata.*

## Experiment 6. Open-set novelty and false-closure control

Experiment 6 asks a narrower question than full theory induction: when the trace is genuinely unseen or hybrid, does the frontier behave like a healthy open-set uncertainty mechanism rather than a forced closed-set commitment [SCHEIRER-2013]? The current novelty layer does not synthesize a brand-new theory family. It measures whether novelty increases uncertainty, frontier width, and question demand without producing the same warning profile on ordinary in-domain traces, and it now does so on a broader novelty set that spans clinical, legal, quality, logistics, hiring, and explicit hybrid traces.

Table 6 shows the result. In-domain traces are flagged as open-set candidates only {{JSON:../../../experiments/experiment6/summary.json#summaryByGroup[caseGroup=in-domain].openSetCandidateRate}} of the time, while open-set traces are flagged at {{JSON:../../../experiments/experiment6/summary.json#summaryByGroup[caseGroup=open-set].openSetCandidateRate}} and hybrid traces at {{JSON:../../../experiments/experiment6/summary.json#summaryByGroup[caseGroup=hybrid].openSetCandidateRate}}. Mean entropy rises from {{JSON:../../../experiments/experiment6/summary.json#summaryByGroup[caseGroup=in-domain].meanEntropy}} in-domain to {{JSON:../../../experiments/experiment6/summary.json#summaryByGroup[caseGroup=open-set].meanEntropy}} on open-set traces. This is the right direction for a commitment-control mechanism.

{{JSON_TABLE:../../../experiments/experiment6/summary.json#summaryByGroup|Condition=caseGroup;Traces=traceCount;Open-set flag=openSetCandidateRate;False closure=falseClosureRate;Questions=questionAvailability;Entropy=meanEntropy}}

Figure 12 shows the same comparison graphically. The strongest novelty response appears at earlier prefixes, where the framework retains wider frontiers and more question demand. Later prefixes can still collapse incorrectly on some unseen cases, which is why the article should describe this as healthy uncertainty management rather than as proof of new local-theory synthesis.

![Novelty response versus in-domain behavior](assets/figure-12-novelty-response.svg)
*Figure 12. Open-set warning rate, false-closure risk, and question availability on in-domain, hybrid, and open-set traces.*

## Experiment 7. Multi-step questioning budgets

Experiment 7 extends the single-step questioning result into an explicit budgeted protocol. The benchmark traces are evaluated under budgets of 0, 1, 2, and 3 answered questions and under three question policies: information gain, a cheaper top-domain heuristic, and a random policy. The study contrasts clean evidence, masked evidence with noisy answers, and masked evidence with adversarial answers. The adversarial condition is fixed as a worst-branch policy that chooses the answer most likely to damage correctness and truth retention.

Table 7 shows the noisy condition, where the comparison is most useful. Under masked noisy evidence, the information-gain policy raises final accuracy from {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-noisy,questionPolicy=information-gain,budget=0].finalAccuracy}} at budget 0 to {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-noisy,questionPolicy=information-gain,budget=2].finalAccuracy}} at budget 2, while the random policy reaches only {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-noisy,questionPolicy=random,budget=2].finalAccuracy}} at the same budget. Clean evidence reaches full recovery quickly, which confirms that the multi-step protocol is not merely adding redundant queries.

{{JSON_TABLE:../../../experiments/experiment7/summary.json#noisyRows|Policy=questionPolicy;Budget=budget;Accuracy=finalAccuracy;Truth retained=truthRetentionRate;Entropy=meanEntropy;Rescued=rescuedFromWrongRate}}

Figure 13 shows accuracy versus budget under the hardest adversarial condition, and Figure 14 shows the corresponding entropy curve. The important negative result is visible as well as the positive one: under adversarial answers, all policies degrade sharply after budget 0. Information gain still drives entropy lower than the random policy, but it does not recover accuracy in the same way it does under clean or noisy answers. At budget 2, the information-gain policy still delivers mean information gain {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-adversarial,questionPolicy=information-gain,budget=2].meanInformationGain}} and mean entropy reduction per question {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-adversarial,questionPolicy=information-gain,budget=2].meanEntropyReductionPerQuestion}}, yet its harmful-question rate rises to {{JSON:../../../experiments/experiment7/summary.json#summaryRows[conditionId=masked-adversarial,questionPolicy=information-gain,budget=2].harmfulQuestionRate}}. This is a real current limitation of the implementation, not a rhetorical footnote.

![Accuracy versus question budget under adversarial evidence](assets/figure-13-accuracy-budget.svg)
*Figure 13. Accuracy versus question budget under masked adversarial evidence for information-gain, top-domain, and random questioning policies.*

![Entropy versus question budget under adversarial evidence](assets/figure-14-entropy-budget.svg)
*Figure 14. Entropy versus question budget under masked adversarial evidence. Information-gain questioning still contracts uncertainty more efficiently than the random policy, but adversarial answers remain hard.*

Taken together, the seven experiments support a stronger and more defensible claim than the earlier three-experiment article draft. The current implementation now supports structural validity, local robustness, broader benchmark transfer, healthier uncertainty on novelty cases, and meaningful question-budget effects under clean and noisy evidence. It still does not support full open-ended theory induction, synthesis of new domain families, or robust adversarial multi-step recovery. The optional auditability study defined elsewhere remains future work rather than current evidence, and it should remain described that way.
