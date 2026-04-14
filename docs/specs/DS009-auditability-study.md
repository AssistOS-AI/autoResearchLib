# DS009 - Optional Auditability Study

## Introduction
The framework claims that retained frontiers are more auditable than single-theory collapse because they localize uncertainty, preserve competing explanations, and expose the effect of follow-up evidence. That claim deserves a dedicated human-facing evaluation, but it should remain optional until the broader validation ladder is stable.

## Core Content
The future auditability study should compare two output modes on the same ambiguous traces: a retained-frontier report and a forced single-theory report. Evaluators should be technical readers who can inspect structured explanations even if they are not domain specialists for every workflow family. The protocol should ask each evaluator to score which output better satisfies three criteria: justification of current uncertainty, usefulness of the proposed next action, and ease of locating why one family was retained or removed after an update.

The recommended study is intentionally small. A first pass can use twelve to twenty ambiguous traces drawn from the questioning and novelty experiments. Each trace should include the original evidence, the emitted report, and the ground-truth family when one exists. Review forms should collect both ordinal ratings and short free-text comments describing where the retained frontier helped or failed.

The current repository should not claim this study has been completed. It should only claim that the protocol exists and that the broader empirical ladder has higher priority. Once the core benchmark, novelty, and multi-step questioning program is stable, this study can test the practical value of auditability as a user-facing property rather than only as an internal architectural slogan.

## Conclusion
The auditability study is the right optional next step because it evaluates the property the framework repeatedly claims as a practical advantage. For now, it remains a scoped protocol for later execution rather than a completed empirical result.

### Critical Implementation Directives
1. Do not present this study as implemented until evaluator data and scoring artifacts exist under `experiments/`.
2. Reuse ambiguous and novelty traces from the main benchmark so the optional study stays grounded in the same frontier behaviors already discussed in the article.
3. Report evaluator disagreement and negative comments explicitly if the study is later run.
