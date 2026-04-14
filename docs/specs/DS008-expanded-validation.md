# DS008 - Expanded Validation Ladder

## Introduction
The original three experiments established that the retained frontier has structural value on a small controlled corpus. That was necessary, but it is not sufficient for the ambition of the broader article. This specification defines the stronger validation ladder required for a defensible research package: robustness to policy variation, transfer across more workflow families and linguistic perturbations, healthy uncertainty under novelty, and multi-step recoverability under difficult evidence.

## Core Content
The validation program should be read as a ladder rather than as one giant claim. The first rung remains structural validation on the original controlled corpus: observer richness, single-step questioning, and recoverability under masking. The second rung is robustness. Here the architecture is challenged by policy perturbations and structural ablations so the results no longer depend on unexplained constants. The third rung is benchmark transfer across more domains, more lexical variety, and external baseline policies. The fourth rung is open-set behavior: what the frontier does when the case is genuinely outside the active family set or mixes known structures in a hybrid way. The fifth rung is multi-step questioning under different budgets and different question policies.

The present repository implements these rungs as Experiments 4 through 7.

| Experiment | Validation role | Primary claim | Current interpretation |
| --- | --- | --- | --- |
| Experiment 4 | Sensitivity and ablation | Nearby policy choices preserve conclusions; rescue and observer richness matter operationally | Robustness of the current symbolic policy |
| Experiment 5 | Expanded benchmark | Frontier retention remains useful across seven workflow families and three lexical strata | Transfer beyond the original eighteen controlled cases |
| Experiment 6 | Open-set novelty | Unseen or hybrid traces trigger higher uncertainty and more questioning than ordinary in-domain traces | Healthy uncertainty management, not full theory synthesis |
| Experiment 7 | Multi-step questioning | Question budgets and policy choice change accuracy-entropy tradeoffs and recovery behavior | Explicit theory management over time |

This ladder also separates architectural claims from implementation claims. The architecture claims that retained frontiers, typed updates, and bounded pluralism are valuable methodological objects. The current implementation claims only what its experiments now support: the deterministic engine is robust over a nearby policy region, transfers to a broader benchmark, maintains healthier uncertainty on novelty cases than on in-domain cases, and supports meaningful multi-step question schedules under non-adversarial conditions. It does not yet claim full open-ended theory induction or broad superiority over large external systems on arbitrary corpora.

Failure analysis is part of the protocol, not an appendix to hide weak cases. The current implementation shows three important limitations that must remain explicit in downstream article text. First, the current sampled policy region is stable, but some ablations, especially coarse observation and removal of domain rescue, visibly change frontier sharpness and truth retention. Second, open-set warning behavior improves under novelty, but some unseen traces can still collapse into a familiar family when the local cue lexicon remains too permissive. Third, multi-step questioning improves clean and noisy conditions, but adversarial answers remain difficult and can overwhelm the current information-gain policy.

## Conclusion
The expanded validation ladder strengthens the article without shrinking its ambition. It turns the paper into a staged argument: what has been shown, what has been stress-tested, what remains open, and where future work must actually improve the mechanism rather than the prose.

### Critical Implementation Directives
1. Keep the seven-experiment suite synchronized so the article can distinguish original structural validation from the newer robustness, transfer, novelty, and multi-step studies.
2. Report both strengths and failure modes, especially under novelty and adversarial questioning, instead of smoothing those results into a single optimistic narrative.
3. State explicitly when an experiment demonstrates healthy uncertainty management rather than full novel-theory induction.
