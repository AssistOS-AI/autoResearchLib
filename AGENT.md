# autoResearchLib repository contract

## Purpose
`AGENT.md` defines how the repository is maintained. It is not a place for research content, mathematical claims, or architectural exposition. Those belong in `docs/specs/`.

## Operating rules
1. The implementation uses Node.js with ESM `.mjs` modules and `async`/`await`. No external dependency may be introduced without explicit approval. AchillesAgentLib is explicitly approved for optional LLM-assisted tasks.
2. All persistent files written to the repository must be in English, even when the interactive discussion happens in another language.
3. `docs/specs/DS0xx-description.md` files are the design source of truth. `DS000-vision.md` defines the research direction, later DS files define architecture, data structures, experiments, and article synchronization.
4. `docs/specs/decisions.md` records architectural or methodological decisions that materially affect the library, the experiments, or the generated article.
5. `experiments/` contains reproducible studies. Structured outputs such as JSON, CSV, and SVG are authoritative. `results.md` is the human-readable report generated from those outputs and should not drift from them.
6. `docs/article/index.html` is a generated artifact. It must be rebuilt by the reusable article-build skill from the article root's `plan/` folder, generated chapter markdown files, experiment descriptions, experiment outputs, bibliography caches, and external SVG assets whenever any source changes.
7. `docs/article/plan/bibliography.md` is the editable bibliography source of truth. `docs/article/plan/bibliography/` stores one folder per cited source with the fetched source cache and the checked-claims cache used during article build.
8. Article-facing SVG assets live under `docs/article/assets/`, while source plan material and intermediate artifacts live under `docs/article/plan/`. The article-build skill must validate each SVG for structural problems and stop the build if the figure remains invalid after a rebuild attempt. Chart SVGs must rely on surrounding captions rather than internal title text, and legend labels must stay readable without overlap.
9. Article publication is agent-orchestrated. The repository should not present article publication as a generic npm or command-line interface because article review, plan repair, bibliography judgment, and figure revision remain agent responsibilities.

## Documentation tone
Use a professional, academic, and defensible tone. Favor affirmative descriptions of active methodologies and practical capabilities. Optimize the writing for software engineers and interdisciplinary researchers, with an engineering-driven emphasis on reproducibility, implementation detail, and applied utility.

## Quality expectations
Every change that affects behavior must keep the library runnable, the experiments reproducible, and the article buildable. Documentation should explain the implementation faithfully, keep citations local to the ideas they support, and treat bibliography verification and figure validation as part of the article build contract. The article itself should remain theory-first: the repository is evidence and implementation support, not the paper's subject.
