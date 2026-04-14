---
chapter: 1
title: Problem, example, and contributions
target: chapters/ch1-introduction.md
dependsOn:
  - ../../specs/DS000-vision.md
  - ../../specs/DS001-library-architecture.md
  - ../../specs/DS008-expanded-validation.md
  - ../../specs/DS005-llm-model-strategy.md
---

# Plan CH1 - Problem, example, and contributions

## Chapter Intent
Open with a concrete ambiguous workflow prefix so the reader immediately understands the problem. Only after that example should the chapter introduce ruliology, applied category theory, and neuro-symbolic concepts. The chapter must clearly separate conceptual contribution, formal contribution, and current validation contribution, then state the present limits before the paper proceeds.

## Paragraph Plan

| Paragraph | Source files | Guidance |
| --- | --- | --- |
| P1 | `DS000 Core Content` | Start with the concrete workflow prefix example and explain why it does not yet determine a unique local theory. No citation is needed here because the point is the article’s own motivating example. |
| P2 | `DS000 Introduction` | Introduce ruliology, applied category theory, and neuro-symbolic concepts with one sentence and one citation per idea. |
| P3 | `DS000 Introduction`, `DS000 Core Content` | State the report-observation-theory gap explicitly and explain why direct text-to-theory inference is methodologically unsound. |
| P4 | `DS000 Core Content`, `DS001 Core Content` | Define the research objective as construction of a bounded local region of theory space rather than one premature final theory. |
| P5 | `DS000 Core Content` | Define meta-rationality as disciplined non-reification backed by explicit frontier retention. |
| P6 | `DS000 Core Content`, `DS008 Core Content` | Separate the contributions into conceptual, formal, and validation contributions. |
| P7 | `DS000 Core Content`, `DS008 Core Content`, `DS005 Core Content` | State the current implementation boundary honestly: what is supported now and what remains open, especially novelty synthesis and adversarial questioning. |

## Generated Chapter Template

# 1. Problem, example, and contributions

Consider the short workflow note: "The item was logged, labeled, and the record was updated." That report already suggests structure, but it does not yet determine whether the local organization is package handling, sample handling, manuscript processing, procurement, or another workflow family. A useful system should therefore not jump directly from text to final theory. It should preserve a structured observation, induce several compatible local theories, and retain them long enough for later evidence to justify stronger commitment.

Ruliology studies what abstract rules do and how spaces of possible rules are organized [WOLFRAM-2026].

Applied category theory studies disciplined composition and structure-preserving translation across domains [FONG-SPIVAK-2019].

Recent neuro-symbolic work argues that learned systems are most useful when they still operate over typed and compositional conceptual carriers [MAO-2025].

These three ingredients become jointly useful only if one methodological distinction is preserved. A natural-language report is not yet the phenomenon itself, and it is not yet a theory of that phenomenon. A direct passage from text to final theory therefore conflates what was stated, what may have been observed, and what is being inferred. The central problem of the paper is how to move between those levels without erasing structure too early.

The proposed objective is not final-label prediction. The objective is construction of a bounded local region of theory space around the available evidence. The system should first lift text into structured observational hypotheses, then induce several candidate local theories, then organize those theories into a neighborhood with explicit relations of refinement, coarsening, refactorization, and observer-relative equivalence.

This is the operational meaning of meta-rationality in the paper. Meta-rationality is disciplined non-reification. The earliest available abstraction is not treated as final merely because it is available. Several candidates remain active for as long as the evidence, the task, or the budget does not justify stronger commitment. The retained frontier is therefore the operational form of epistemic restraint rather than a vague appeal to pluralism.

The paper makes three distinct contributions. First, it proposes a conceptual architecture that separates report, observation, local theory, neighborhood geometry, and lexicalized explanation. Second, it gives these stages explicit formal objects and update rules. Third, it validates those objects through a seven-experiment ladder that covers structural observer effects, questioning, cue-masking recovery, sensitivity and ablation, broader benchmark transfer, novelty handling, and multi-step questioning.

`autoResearchLib` is the reference implementation of this proposal, not the proposal itself. The current implementation now supports stronger claims than the earlier three-experiment prototype, but those claims remain bounded. The experiments support frontier contraction under richer observation, question-driven recovery on ambiguous traces, transfer over a broader seven-domain benchmark, and healthier uncertainty on novelty cases. They do not yet support full open-ended theory induction, synthesis of genuinely new domain families, or strong adversarial multi-step recovery. The rest of the article develops that stronger but still measured claim in detail.
