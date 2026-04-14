---
chapter: 1
title: Problem and research objective
target: chapters/ch1-introduction.md
dependsOn:
  - ../../specs/DS000-vision.md
  - ../../specs/DS001-library-architecture.md
  - ../../specs/DS005-llm-model-strategy.md
---

# Plan CH1 - Problem and research objective

## Chapter Intent
Make the reader understand the theoretical thesis before the repository appears. The chapter should recover the original argumentative opening: ruliology, applied category theory, and neuro-symbolic AI become compatible only if the system distinguishes report from observation and theory, and only if it preserves several local theories until stronger commitment is justified. `autoResearchLib` should appear only at the end as the reference implementation that instantiates the thesis.

## Paragraph Plan

| Paragraph | Source files | Guidance |
| --- | --- | --- |
| P1 | `DS000 Introduction` | Open with the three theoretical ingredients. Give each one its own sentence and citation. |
| P2 | `DS000 Introduction` | State the report-observation-theory distinction explicitly and explain why direct text-to-theory inference is methodologically unsound. |
| P3 | `DS000 Core Content` | Formulate the research objective as construction of a bounded local region of theory space rather than inference of one final theory. |
| P4 | `DS000 Core Content` | Define meta-rationality as disciplined non-reification and bounded plural retention. |
| P5 | `DS001 Core Content`, `DS005 Introduction` | Bridge toward the architecture: the system lifts, induces, explores, and only then lexicalizes. |
| P6 | `DS000 Core Content` | Introduce `autoResearchLib` only as the reference implementation and source of reproducible evidence. |

## Generated Chapter Template

# 1. Problem and research objective

## Three ingredients

Ruliology studies what abstract rules do and how spaces of possible rules are organized [WOLFRAM-2026].

Applied category theory studies disciplined composition and structure-preserving translation across domains [FONG-SPIVAK-2019].

Recent neuro-symbolic work argues for concept-centric systems in which objects, relations, and actions remain typed and compositional even when learned components are involved [MAO-2025].

## The methodological gap

These three directions become genuinely compatible only if one basic distinction is preserved. When the input is natural-language text, the system does not observe a phenomenon directly. It observes a description of an observation, and in some cases it observes a description of a theory about that phenomenon. A direct passage from text to final theory is therefore methodologically unsound because it conflates what was said, what may have been observed, and what is being inferred.

## Research objective

The objective of the proposed architecture is not to infer one privileged theory from text. The objective is to construct, under explicit uncertainty, a bounded local region of theory space around the available evidence. The system should first lift text into structured observational hypotheses. It should then induce several candidate local theories compatible with those hypotheses. It should finally organize those theories into a local neighborhood with explicit relations of refinement, coarsening, refactorization, and observer-relative equivalence.

The result is not a single ontology that pretends to settle the matter too early. The result is a managed family of plausible local theories together with robust consequences and theory-sensitive consequences. That is the sense in which the framework is ruliological in practice: it studies nearby rule-bearing possibilities instead of collapsing them immediately into one final descriptive winner.

## Meta-rational stance

This architecture is meta-rational in a precise and operational sense. Early abstractions are not treated as final merely because they are available. Several candidates remain active for as long as the evidence, the task, or the cost model does not justify stronger commitment. Meta-rationality here is therefore not vagueness. It is disciplined non-reification backed by explicit retention rules, explicit score profiles, and explicit neighborhood structure.

## Reference implementation

The rest of the article develops this thesis in concrete form. It explains the four-stage neuro-symbolic pipeline, the formal objects and update rules that make the frontier auditable, and the controlled experiments that test the current structural claims. `autoResearchLib` appears in that discussion as the reference implementation and as the location of the reproducible experiments, not as the paper's main subject.
