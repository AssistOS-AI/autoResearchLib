# Article Build Plan

## Title
A Meta-Rational Neuro-Symbolic Architecture for Ruliologic Exploration

## Abstract
The article studies how a theory-first neuro-symbolic architecture can move from ambiguous reports to a bounded frontier of local theories without collapsing uncertainty too early. The paper starts from a concrete workflow example in which short administrative text does not yet determine a unique local organization, then develops a four-stage pipeline that separates observational lifting, local theory induction, local rulial exploration, and late conceptual alignment. The current validation ladder contains seven experiments: three structural studies on the original controlled corpus, a sensitivity-and-ablation study, an expanded seven-domain benchmark with lexical variation and external baselines, an open-set novelty study, and a multi-step questioning study. The resulting evidence supports a defensible but bounded claim: retained frontiers improve transfer, uncertainty management, and recoverability on controlled and expanded workflow evidence, while novelty synthesis and adversarial multi-step recovery remain open problems rather than hidden assumptions.

## Chapter vision

| Chapter | Vision | Conceptual sources | Generated chapter file |
| --- | --- | --- | --- |
| 1. Problem, example, and contributions | Open with a concrete ambiguous workflow prefix, explain the report-observation-theory gap, and separate conceptual, formal, and validation contributions. | `DS000-vision.md`, `DS001-library-architecture.md`, `DS005-llm-model-strategy.md` | `plan/chapters/ch1-introduction.md` |
| 2. Neuro-symbolic pipeline and epistemic labor | Explain the four-stage pipeline through the running example, clarify neural versus symbolic roles, and keep the architecture theory-first. | `DS001-library-architecture.md`, `DS005-llm-model-strategy.md`, `DS006-library-usage.md` | `plan/chapters/ch2-architecture.md` |
| 3. Formal objects, budgets, and update rules | Define `O(x)`, `T`, `N(Oi)`, `F`, the budget objects, entropy, information gain, rescue tolerance, alignment utility, and the canonical CNL projection. | `DS002-data-model.md`, `DS001-library-architecture.md`, `DS006-library-usage.md` | `plan/chapters/ch3-data-model.md` |
| 4. Validation ladder and empirical results | Present the structural studies, robustness and ablation, expanded benchmark transfer, novelty handling, and multi-step questioning with explicit failure analysis. | `DS003-experimental-protocol.md`, `DS008-expanded-validation.md`, experiment descriptions and results | `plan/chapters/ch4-experiments.md` |
| 5. Interpretation, limits, and next studies | Explain what the current implementation now supports, where the open problems remain, how bounded LLM assistance fits, and where the optional auditability study belongs. | `DS000-vision.md`, `DS005-llm-model-strategy.md`, `DS008-expanded-validation.md`, `DS009-auditability-study.md`, `DS007-usage-best-practices.md` | `plan/chapters/ch5-conclusion.md` |

## Regeneration workflow

1. The agent reads this file first and invokes the article-build skill as the publication workflow.
2. The skill reads `plan/plan_ch1.md` through `plan/plan_ch5.md` to understand paragraph intent, source usage, and generated chapter structure.
3. Each `plan/plan_chN.md` file declares its dependency list and target chapter markdown file in frontmatter.
4. If a chapter plan or any of its declared source files is newer than the generated chapter markdown file, the skill refreshes that chapter markdown file under `plan/chapters/`.
5. The skill reads `plan/bibliography.md` as the editable source of truth for citation metadata, bootstrap text, and deterministic support profiles, then validates citation support through `plan/bibliography/<citation-key>/`.
6. The skill reads `plan/assets.json` to know which source SVGs or external SVGs must be copied into `assets/`, validates each result, and requests a rebuild if a figure still fails structural checks.
7. If `index.html` is older than `plan/plan.md`, `plan/bibliography.md`, any generated chapter markdown file, any article-facing SVG asset, or any bibliography verification artifact, the skill rebuilds the final HTML and emits browser-side print or save-PDF controls.
8. The skill writes `plan/build-manifest.json` so the refresh status can be audited.
9. Article publication remains agent-owned; the repository may expose reusable skill code, but not a blind CLI publication path.

## Authoring rules for chapter plans

Each `plan/plan_chN.md` file must contain:

1. A `## Chapter Intent` section that explains what the chapter should make the reader understand.
2. A `## Paragraph Plan` section describing, paragraph by paragraph, which DS section or experiment artifact supports the paragraph and how the paragraph should be formulated.
3. A `## Generated Chapter Template` section that the build skill can deterministically turn into the generated chapter markdown file.
4. Generated chapter text should not mention file paths, module names, project decision logs, or npm commands in the main narrative.

## Figure and table rules

SVG figures remain external files under `assets/`, next to `index.html`, and are referenced from generated chapter markdown via standard Markdown image syntax. Tables remain Markdown tables inside generated chapter markdown and must be introduced by descriptive prose so the renderer can integrate them into the text rather than present them as detached dumps. Conceptual SVGs should use short labels, simple internal glyphs, and surrounding prose for longer explanations. Chart SVGs should not contain internal title text because titles belong in Markdown captions, and legends should be stacked or otherwise spaced so labels never overlap.

## Tone and audience

The article should use a professional, academic, and defensible tone aimed at software engineers and interdisciplinary researchers. It should emphasize active methodology, formal clarity, reproducible implementation, and measured scope. Each citation should support one local idea rather than act as a bundled appeal to authority.
