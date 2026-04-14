---
chapter: 4
title: Experimental validation
target: chapters/ch4-experiments.md
dependsOn:
  - ../../specs/DS003-experimental-protocol.md
  - ../../../experiments/experiment1/description.md
  - ../../../experiments/experiment1/results.md
  - ../../../experiments/experiment1/summary.json
  - ../../../experiments/experiment2/description.md
  - ../../../experiments/experiment2/results.md
  - ../../../experiments/experiment2/summary.json
  - ../../../experiments/experiment3/description.md
  - ../../../experiments/experiment3/results.md
  - ../../../experiments/experiment3/summary.json
---

# Plan CH4 - Experimental validation

## Chapter Intent
Show that the paper is backed by real, controlled evidence rather than decorative metrics. The chapter should explain what enters each experiment, what the pipeline emits, which structural claim is being tested, how the new 18-case corpus changes the strength of the evidence, and where the evidence remains partial even after the new baseline study.

## Paragraph Plan

| Paragraph | Source files | Guidance |
| --- | --- | --- |
| P1 | `DS003 Introduction` | Open by stating that the current repository validates three structural claims of the broader theory, not the whole framework. |
| P2 | `experiment1/description.md`, `experiment1/summary.json`, `DS003 Core Content` | Explain the full input/output shape of Experiment 1, including corpus size, prefixing, observer families, measured artifacts, and the fact that the experiment uses the public evidence-analysis contract rather than internal helpers. |
| P3 | `experiment1/results.md`, `experiment1/summary.json` | Introduce Table 3 with concrete values. Mention what changes at Prefix 1, Prefix 2, and Prefix 3. |
| P4 | `experiment1/summary.json`, `experiment1/results.md` | Use Figure 3 to explain the accuracy trajectory and why earlier typed cues matter. |
| P5 | `experiment1/summary.json`, `experiment1/results.md` | Use Figure 4 to explain entropy contraction, then interpret the rich-observer signal carefully, including the remaining ambiguous generic cases. |
| P6 | `experiment2/description.md`, `experiment2/summary.json`, `experiment2/results.md` | Explain Experiment 2 in human terms: ambiguous frontier, selected question, gold answer, updated frontier, emitted before/after metrics, and representative canonical traces. Introduce Table 4. |
| P7 | `experiment2/summary.json`, `experiment2/results.md` | Use Figures 5 and 6 to explain entropy reduction, accuracy gains, and the cases where one question still leaves residual ambiguity. |
| P8 | `experiment3/description.md`, `experiment3/summary.json`, `experiment3/results.md` | Explain Experiment 3 as a cue-masking robustness test with lexical and single-theory baselines plus the frontier-and-question pipeline, again using the same high-level usage contract. |
| P9 | `experiment3/summary.json`, `experiment3/results.md` | Introduce Table 5 with the masked and unmasked comparisons. Highlight resolved accuracy after one question and retained-frontier truth rate. |
| P10 | `experiment3/summary.json`, `experiment3/results.md` | Use Figure 7 to compare the policies and Figure 8 to explain why questioning matters once the frontier preserves recoverable alternatives. |
| P11 | `DS003 Conclusion` | Close by stating exactly what the experiments support and what they do not yet prove. |

## Generated Chapter Template

# 4. Experimental validation

The current repository validates three structural claims of the broader framework rather than the whole theory at once. The first claim is representational: richer observation should sharpen the retained frontier earlier than coarse observation. The second claim is managerial: when several local theories remain plausible, the system should be able to ask a useful next question and update the frontier transparently. The third claim is recoverability under weak evidence: when strong cues are masked, preserving a frontier should still be more useful than collapsing immediately to a single early answer.

All three experiments exercise the same public evidence-analysis and evidence-update contract that the library exposes to downstream users. Each run records canonical run metadata and CNL-family coverage alongside the ordinary quantitative outputs, so the experiments validate the intended usage surface of the library rather than only repository-internal helper calls.

## Experiment 1. Observer richness and frontier shape

Experiment 1 uses {{JSON:../../../experiments/experiment1/summary.json#caseCount}} controlled workflow cases distributed across package handling, laboratory sample handling, and manuscript processing. Each case is exposed through four textual prefixes, and each prefix is analyzed twice: once with a coarse observer and once with a richer observer. The input to each run is therefore a prefix string plus an observer family, while the output is a full retained frontier summary: ranked domain distribution, frontier entropy, equivalence compression, question availability, and top-domain accuracy. In other words, the experiment records not only which family is ranked first, but also how much structured ambiguity remains and whether further questioning is still needed.

Table 3 summarizes the aggregate observer-comparison results. The clearest separation appears at Prefix 2: the rich observer raises mean top-domain accuracy from {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=2,observerId=coarse].meanAccuracy}} to {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=2,observerId=rich].meanAccuracy}} while reducing mean frontier entropy from {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=2,observerId=coarse].meanEntropy}} to {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=2,observerId=rich].meanEntropy}}. At Prefix 1 both observers are still mostly generic; by Prefix 3 the rich observer reaches {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=3,observerId=rich].meanAccuracy}} accuracy and the coarse observer catches up to {{JSON:../../../experiments/experiment1/summary.json#summaryRows[prefixDepth=3,observerId=coarse].meanAccuracy}} once stronger procedural evidence arrives.

{{JSON_TABLE:../../../experiments/experiment1/summary.json#summaryRows|Prefix=prefixDepth;Observer=observerId;Cases=caseCount;Accuracy=meanAccuracy;Entropy=meanEntropy;Equivalence compression=meanEquivalenceCompression;Question availability=questionAvailability}}

Figure 3 isolates the accuracy trajectory. At Prefix 1 both observers remain limited because only macro-structural workflow language is visible. At Prefix 2 the rich observer starts separating the cases where typed domain markers are already present, while the coarse observer still sees a broad package-like explanation. By Prefix 3 most cases are resolved, but the rich observer reaches the correct top-ranked domain earlier and more consistently.

![Observer accuracy by prefix](assets/figure-3-observer-accuracy.svg)
*Figure 3. Mean domain accuracy by prefix depth for coarse and rich observers.*

Figure 4 complements the accuracy chart with the quantity that matters more for this paper: frontier entropy. A system may improve its top-ranked answer without making the retained neighborhood substantially more disciplined. Here the entropy drop shows that the richer observer is not only guessing better; it is retaining a smaller and sharper set of plausible local theories once typed cues appear.

![Observer entropy by prefix](assets/figure-4-observer-entropy.svg)
*Figure 4. Mean domain entropy by prefix depth for coarse and rich observers.*

The observer-richness result should be read carefully. It does not show magical understanding. Generic sample and manuscript prefixes can still remain ambiguous when the decisive cue has not yet appeared. What the experiment demonstrates is that once the relevant cue does appear, a richer observer converts it into earlier frontier contraction and lower question demand. That is the practical value of observational lifting in the current deterministic implementation.

## Experiment 2. Discriminating questions and frontier update

Experiment 2 keeps the ambiguous traces that survive the initial analysis. For each such trace, the system receives the current frontier, selects the question with the highest expected information gain, applies the gold answer from the case metadata, and recomputes the frontier. The emitted outputs include the before/after domain distribution, entropy before and after questioning, accuracy before and after questioning, the selected question text, the probed cue, the resulting information gain, and representative canonical before/after traces. The current corpus makes this process easy to interpret because the selected question often probes evidence of dispatch or destination, which separates package-like behavior from the other workflow families.

Table 4 shows that on Prefix 2 traces a single discriminating question lowers mean entropy from {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=2].meanEntropyBefore}} to {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=2].meanEntropyAfter}} while improving mean accuracy from {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=2].meanAccuracyBefore}} to {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=2].meanAccuracyAfter}}. On Prefix 3 traces, the remaining ambiguous subset still benefits: entropy falls from {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=3].meanEntropyBefore}} to {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=3].meanEntropyAfter}} and accuracy rises from {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=3].meanAccuracyBefore}} to {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=3].meanAccuracyAfter}}.

{{JSON_TABLE:../../../experiments/experiment2/summary.json#summaryRows|Prefix=prefixDepth;Cases=caseCount;Entropy before=meanEntropyBefore;Entropy after=meanEntropyAfter;Accuracy before=meanAccuracyBefore;Accuracy after=meanAccuracyAfter;Information gain=meanInformationGain}}

Figure 5 shows the entropy effect directly, and Figure 6 shows how much of that contraction becomes better top-ranked accuracy. The drop is large at both retained prefix depths because the selected question is designed to cut across the dominant ambiguity. The Prefix 2 result remains intentionally partial rather than perfect. A negative answer to the package-oriented question removes the package family, but it can still leave sample and manuscript explanations insufficiently separated in the current bundle design. That is why the mean Prefix 2 accuracy rises to {{JSON:../../../experiments/experiment2/summary.json#summaryRows[prefixDepth=2].meanAccuracyAfter}} rather than to 1.0.

![Entropy before and after questioning](assets/figure-5-question-entropy.svg)
*Figure 5. Mean frontier entropy before and after applying the best discriminating question.*

![Accuracy before and after questioning](assets/figure-6-question-accuracy.svg)
*Figure 6. Mean top-domain accuracy before and after applying the best discriminating question.*

## Experiment 3. Cue masking, baselines, and recoverability

Experiment 3 stresses the same framework under weaker lexical evidence. It reuses the full {{JSON:../../../experiments/experiment3/summary.json#caseCount}}-case corpus, restricts attention to Prefix 2 and Prefix 3, and evaluates every trace in clean form and in a cue-masked form where the most specific domain markers are rewritten into more generic administrative language. The experiment produces {{JSON:../../../experiments/experiment3/summary.json#traceCount}} analyzed traces and compares four policy levels: a lexical-support baseline, a single-best-theory baseline, the immediate frontier top domain, and the full frontier result after one question when a discriminating question is available.

Table 5 shows why this matters. Under masked Prefix 2 traces, the lexical baseline falls to {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=2].lexicalAccuracy}} and the single-theory baseline to {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=2].singleTheoryAccuracy}}. The immediate frontier top remains equally conservative at {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=2].frontierTopAccuracy}}, but the frontier still retains the correct domain somewhere on the active neighborhood for all masked Prefix 2 traces. Because the retained frontier keeps those alternatives alive, one discriminating question lifts the end-to-end pipeline to {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=2].resolvedAccuracy}}.

{{JSON_TABLE:../../../experiments/experiment3/summary.json#summaryRows|Condition=label;Cases=caseCount;Lexical baseline=lexicalAccuracy;Single theory=singleTheoryAccuracy;Frontier top=frontierTopAccuracy;Frontier + one question=resolvedAccuracy;Truth retained on frontier=frontierRetentionRate}}

Figure 7 compares the policy levels directly, while Figure 8 isolates the ambiguous-trace recovery effect. The masked Prefix 3 traces are particularly instructive: the immediate frontier top remains at {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=3].frontierTopAccuracy}}, but one question lifts the full pipeline to {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=3].resolvedAccuracy}}. On the ambiguous masked subset, question accuracy rises from {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=3].questionAccuracyBefore}} to {{JSON:../../../experiments/experiment3/summary.json#summaryRows[conditionId=masked,prefixDepth=3].questionAccuracyAfter}}. This is the strongest current evidence for the frontier discipline: its main value is recoverability under incomplete cues, not just immediate top-label confidence.

![Baseline comparison under cue masking](assets/figure-7-baseline-accuracy.svg)
*Figure 7. Policy comparison on clean and cue-masked traces, including the full frontier result after one discriminating question when available.*

![Question recovery on ambiguous traces](assets/figure-8-question-recovery.svg)
*Figure 8. Accuracy before and after questioning on ambiguous traces, together with the fraction rescued by one discriminating answer.*

Taken together, the three experiments support the current structural thesis of the repository. Richer observation changes the frontier earlier, explicit questioning reduces frontier uncertainty further when ambiguity remains, and frontier retention preserves recoverability when decisive cues are masked. They do not yet prove full theory induction under open-ended semantics or broad competitiveness against external learning systems. They show that the proposed objects and update rules already have measurable value on a controlled but substantially stronger deterministic corpus.
