# DS003 - Experimental Protocol

## Introduction
The experiments are the validation layer of the project. They must justify specific claims about retained frontiers, question-driven update, and bounded commitment rather than merely report a final label. The protocol is therefore organized as a ladder. Early experiments test structural claims on a controlled corpus. Later experiments test robustness, transfer, novelty behavior, and multi-step recoverability. This separation is essential because the architecture is broader than the current implementation, and the article must not blur those two levels.

## Core Content
The shared data now has three layers. The first layer is the original controlled corpus of eighteen workflow cases across package handling, laboratory sample handling, and manuscript processing. The second layer is an expanded seven-domain benchmark with controlled, paraphrased, and noisy strata, built from thirty-four base cases and rendered as one hundred and two benchmark cases with deterministic development and test splits. The third layer is a novelty set with genuinely unseen domain families and hybrid traces. Every benchmark case remains segmented into four ordered textual stages so the same base trace can be evaluated at several prefix depths.

The current experiment suite has seven roles.

| Experiment | Dataset slice | Main question | Current claim |
| --- | --- | --- | --- |
| Experiment 1 | Original 18-case corpus | Does a richer observer contract the frontier earlier? | Yes, once typed cues appear |
| Experiment 2 | Ambiguous traces from the original corpus | Does one discriminating question lower entropy and improve ranking? | Yes, on the retained ambiguous subset |
| Experiment 3 | Original corpus with deterministic cue masking | Is retained-frontier recovery better than early-collapse baselines? | Yes, especially when the decisive cue is delayed |
| Experiment 4 | Expanded benchmark test split | Are results robust to policy perturbation and structural ablation? | Largely yes, with visible sensitivity to coarse observation and rescue removal |
| Experiment 5 | Expanded benchmark test split | Does the frontier transfer across more domains and lexical noise, and how does it compare with external baselines? | Yes, with a persistent truth-retention advantage |
| Experiment 6 | Novelty set plus in-domain benchmark traces | Does unseen or hybrid evidence trigger healthy uncertainty rather than false closure? | Partially yes; novelty warning rises without dominating in-domain traces |
| Experiment 7 | Paraphrased and noisy benchmark traces | How do question budgets and question policies affect recovery over time? | Clean and noisy recovery improves; adversarial answers remain difficult |

The protocol should distinguish four families of metric.

1. **Ranking metrics.** Top-domain accuracy measures whether the highest-ranked domain matches the declared ground truth when one exists. Single-theory and lexical or statistical baselines are reported separately when the experiment includes them.
2. **Frontier metrics.** Truth-retention rate asks whether the ground-truth family survives anywhere on the active frontier. Frontier width and domain entropy measure how much structured ambiguity remains. Premature-collapse rate measures how often the correct family disappears while the current top confidence is already high.
3. **Questioning metrics.** Information gain is computed as the entropy drop expected from a discriminating question over the current frontier. Question availability records whether a useful question still exists. Multi-step recovery metrics include entropy per budget, final accuracy per budget, and rescued-from-wrong rate.
4. **Uncertainty and calibration metrics.** Expected calibration error is used on the expanded benchmark to compare confidence quality. Open-set candidate rate and false-closure rate summarize whether novelty triggers healthy uncertainty or an overconfident in-domain collapse.

The benchmark split must remain deterministic and domain-balanced. Development cases are used only for lightweight baseline fitting and sanity checks, not for tuning the article narrative after looking at the test outputs. The test split must stay authoritative for the tables and figures emitted into the article. Novelty cases should never leak into the benchmark training or development paths.

The experiment suite also validates the intended public usage contract of the library. All runs should go through `analyzeEvidence(...)` and, where updates are involved, `applyEvidenceUpdate(...)`. Canonical CNL coverage and run metadata should be recorded so the experiments continue to measure the stable public surface rather than private repository helpers.

Each experiment folder must contain a concise `description.md`, machine-readable outputs, generated CSV tables, SVG figures, and a `results.md` report derived from those same artifacts. Article chapter plans may quote those outputs, but they must not become an alternate source of truth. When a benchmark artifact, figure, or result report changes, the generated article must be rebuilt as part of the same validation cycle.

Failure analysis is mandatory. The current implementation must state three limitations plainly in downstream reports. First, the controlled observer and questioning results do not prove full open-ended theory induction. Second, open-set handling currently demonstrates disciplined uncertainty management rather than synthesis of a genuinely new local theory family. Third, multi-step questioning degrades sharply under adversarial answers and should be described as a current weakness rather than hidden behind aggregate scores.

## Conclusion
The protocol turns the experiment suite into a staged argument. The repository can now defend structural claims, robustness claims, transfer claims, novelty-management claims, and question-budget claims separately. That is stronger and more honest than pretending one benchmark number settles the whole research program.

### Critical Implementation Directives
1. Keep experiment outputs machine-readable and article-ready: JSON first, then CSV, SVG, and derived Markdown.
2. Separate structural validation, robustness validation, transfer validation, novelty validation, and multi-step validation in both code and article prose.
3. Report limitations explicitly when novelty handling or adversarial questioning remains weak.
