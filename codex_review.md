# Codex Review - Remaining Open Items

This file now tracks only the substantive review points that remain open **after** the latest repair pass over specs, article build, experiments, and public-library contract.

## Current assessment

The repository is now materially tighter than before. The main contract mismatches from the prior review were addressed:

1. question utility is now computed over retained-domain entropy and serialized with answer maps and partitions,
2. the mixed-hypothesis retained frontier is now described honestly in specs and article plans,
3. article-build citation checking is now source-backed by default, records support snippets and spans, and distinguishes `cached-source-supported` from `manual-waived`,
4. benchmark-driven experiments now keep segmented evidence and record public usage metadata,
5. alignment disabling now removes alignment utility from ranking,
6. LLM routing metadata now matches DS005,
7. the experiment README and article-build UI/docs were updated.

What remains is not contract drift. What remains is the next layer of scientific strengthening.

## Remaining open items

### 1. Novelty handling is still bounded uncertainty management, not full local-theory induction

Experiment 6 is stronger than before because the novelty layer is broader and the article now states the limit clearly. Even so, the implementation still reacts to novelty by widening uncertainty rather than synthesizing a genuinely new local theory family. That is now documented honestly, but it is still a real research gap.

**Suggested next step:** add a bounded novelty-proposal object or a leave-one-family-out protocol that tests whether the frontier can propose a modest local theory sketch instead of only refusing premature closure.

### 2. External baselines are still lightweight

The expanded benchmark now has better instrumentation, but the external baselines remain cue-vote and naive Bayes. That is acceptable for the current deterministic package, yet it still leaves the stronger comparative question open.

**Suggested next step:** add one stronger conventional baseline and, if feasible, one bounded LLM or neural baseline under the same evidence protocol.

### 3. Human auditability remains specified but not yet executed

DS009 defines a reasonable auditability study, and the article now treats it as future work rather than current evidence. The repository still does not contain executed human-study outputs.

**Suggested next step:** run the lightweight evaluator study already described in DS009 and store the raw results under `experiments/`.

### 4. SVG validation remains a guardrail, not semantic proof

The current SVG validator is useful and now catches label overlap and other structural issues early, but it still cannot prove that a figure is conceptually good. That is acceptable if kept explicit.

**Suggested next step:** add a small fixture suite of known-bad SVGs and continue to treat validator success as necessary but not sufficient.

## Closing note

The remaining work is now mostly about deepening the empirical and human-facing evidence, not about repairing internal inconsistency. That is a much healthier state for the repository.
