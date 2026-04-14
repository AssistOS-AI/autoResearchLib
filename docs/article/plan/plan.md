# Article Build Plan

## Title
A Meta-Rational Neuro-Symbolic Architecture for Ruliologic Exploration

## Abstract
This article studies three concrete validation modes for a meta-rational neuro-symbolic architecture. The first asks whether richer observers narrow the plausible frontier earlier while preserving structured alternatives that still deserve retention. The second asks whether discriminating questions reduce uncertainty and improve the ranking of local theories once ambiguous prefixes have already been lifted into explicit observations. The third asks whether the retained frontier remains useful when the strongest domain cues are masked and early collapse policies become fragile. The resulting evidence supports a practical conclusion: a theory-guided pipeline can preserve plural structure during early induction, recover from masked or delayed cues through explicit questioning, and remain auditable throughout the update loop. Ruliology provides the orientation toward rule spaces, applied category theory provides disciplined composition and translation, and neuro-symbolic AI provides typed and compositional conceptual carriers for the retained frontier.

## Chapter vision

| Chapter | Vision | Conceptual sources | Generated chapter file |
| --- | --- | --- | --- |
| 1. Problem and research objective | State the methodological gap between report, observation, and theory; connect ruliology, applied category theory, and neuro-symbolic concepts; define the meta-rational objective. | `DS000-vision.md`, `DS005-llm-model-strategy.md` | `plan/chapters/ch1-introduction.md` |
| 2. Neuro-symbolic pipeline | Explain the four stages abstractly, clarify the neural-symbolic division of labor, and make the public usage contract explicit without turning the chapter into a repository tour. | `DS001-library-architecture.md`, `DS005-llm-model-strategy.md`, `DS006-library-usage.md` | `plan/chapters/ch2-architecture.md` |
| 3. Formal model and frontier management | Define the core objects, neighborhood geometry, score profile, update rules, and canonical CNL projection, then present the operational algorithms in standard Markdown form. | `DS002-data-model.md`, `DS001-library-architecture.md`, `DS006-library-usage.md` | `plan/chapters/ch3-data-model.md` |
| 4. Experimental validation | Describe the current controlled studies more fully: what enters, what is measured, what leaves the pipeline, and what the evidence supports or leaves open. The chapter should now carry three experiments, including the cue-masking baseline study. | `DS003-experimental-protocol.md`, experiment descriptions and results | `plan/chapters/ch4-experiments.md` |
| 5. Interpretation, scope, and conclusion | Explain why the framework is substantively meta-rational, where the current implementation fits, what applications follow, how the library should be used in practice, and how bounded learned assistance should be understood. | `DS000-vision.md`, `DS005-llm-model-strategy.md`, `DS003-experimental-protocol.md`, `DS006-library-usage.md`, `DS007-usage-best-practices.md` | `plan/chapters/ch5-conclusion.md` |

## Regeneration workflow

1. The agent reads this file first and invokes the article-build skill as the publication workflow.
2. The skill reads `plan/plan_ch1.md` through `plan/plan_ch5.md` to understand paragraph intent, source usage, and generated chapter structure.
3. Each `plan/plan_chN.md` file declares its dependency list and target chapter markdown file in frontmatter.
4. If a chapter plan or any of its declared source files is newer than the generated chapter markdown file, the skill refreshes that chapter markdown file under `plan/chapters/`.
5. The skill reads `plan/bibliography.md` as the editable source of truth for citation metadata, bootstrap text, and deterministic support profiles, then validates citation support through `plan/bibliography/<citation-key>/`.
6. The skill reads `plan/assets.json` to know which source SVGs or external SVGs must be copied into `assets/`, validates each result, and requests a rebuild if a figure still fails structural checks.
7. If `index.html` is older than `plan/plan.md`, `plan/bibliography.md`, any generated chapter markdown file, any article-facing SVG asset, or any bibliography verification artifact, the skill rebuilds the final HTML.
8. The skill writes `plan/build-manifest.json` so the refresh status can be audited.
9. `package.json` should not expose the article build as a generic publication shortcut, and the workflow should be described as agent-owned rather than as a command-line build.

## Authoring rules for chapter plans

Each `plan/plan_chN.md` file must contain:

1. A `## Chapter Intent` section that explains what the chapter should make the reader understand.
2. A `## Paragraph Plan` section describing, paragraph by paragraph, which DS section or experiment artifact supports the paragraph and how the paragraph should be formulated.
3. A `## Generated Chapter Template` section that the build skill can deterministically turn into the generated chapter markdown file.
4. The generated chapter text should not mention file paths, implementation modules, or npm commands in the main narrative.

## Figure and table rules

SVG figures must remain external files under `assets/`, next to `index.html`, and must be referenced from the generated chapter markdown files via standard Markdown image syntax. Tables must remain Markdown tables in the generated chapter markdown files and must be introduced by descriptive prose so the HTML renderer can keep them integrated into the article rather than treating them as detached dumps. Conceptual SVGs should use short labels, internal glyphs or miniature diagrams where helpful, and surrounding prose for longer explanations. Chart SVGs should not contain internal title text because titles belong in Markdown captions, and legends should be stacked or otherwise spaced so labels never overlap.

## Tone and audience

The article should use a professional, academic, and defensible tone aimed at software engineers and interdisciplinary researchers. It should emphasize active methodology, theoretical clarity, practical implementation where relevant, reproducible experiments, and cross-disciplinary utility.
