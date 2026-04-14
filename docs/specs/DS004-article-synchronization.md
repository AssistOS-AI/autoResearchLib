# DS004 - Article Synchronization

## Introduction
The article is a generated research artifact, not an independently maintained essay. Its credibility depends on clear provenance: conceptual claims come from the DS files, quantitative claims come from experiment outputs, and citations are rendered explicitly in the generated HTML after they have been checked against cached source material.

## Core Content
The article should remain theory-first. It is not a product page for `autoResearchLib`. The repository appears in the paper as a reference implementation and a source of reproducible experiments. The main-body chapter prose should therefore explain the theoretical architecture, the formal objects, the operational algorithms, and the meaning of the experiments without talking about file paths, module names, or npm commands. Repository structure belongs in README-level documentation, not in the article narrative.

The article should have five chapters at most: problem and research objective, neuro-symbolic pipeline, formal model and frontier management, experimental validation, and interpretation or scope. Chapter plans may map these themes to chapter titles more precisely, but the narrative should preserve that arc. The introduction explains the methodological gap between text and theory and states the meta-rational thesis. The architecture chapter explains the four-stage pipeline in abstract terms. The formal-model chapter explains the core objects, score profile, and update rules. The experiments chapter reports the current controlled studies in a more human and theory-aware way than a bare table dump. The final chapter explains why the framework is substantively meta-rational, what the current implementation validates, and where the scope of the proposal extends.

The build process must avoid relying on non-standard Markdown features such as implicit LaTeX support. DS files should therefore be written in plain Markdown prose with ordinary headings, tables, fenced code blocks, and code-style notation. The article builder should no longer compose HTML directly from DS files alone. Instead, it should operate on an article root whose visible surface is `index.html`, `assets/`, and `plan/`. The `plan/` folder should contain `plan.md`, detailed `plan_chN.md` files, an editable `bibliography.md`, a generated `chapters/` folder, and other intermediate artifacts such as build manifests or source SVG declarations. Citations should be rendered as bracketed labels in the prose, checked through `plan/bibliography/<citation-key>/`, and expanded into a bibliography section at the end of the article with stable links.

Synchronization should be strict rather than aspirational. A change in any DS file, experiment description, experiment results file, figure source, chapter-plan file, bibliography source file, or bibliography verification cache requires the dependent chapter markdown or final HTML to be regenerated as appropriate. `plan/plan.md` should describe this mapping, while the generated `index.html` should embed the current external SVG files and tables directly.

## Conclusion
The article should read like a real technical paper because it is built from stable design documents and reproducible experiments. The correct way to keep it current is generation, not manual copy-paste.

### Critical Implementation Directives
1. Build the article from chapter markdown files generated from `plan/plan_chN.md`, DS files, bibliography metadata, asset declarations, and experiment artifacts with a repository skill implementation committed under `skills/`.
2. Render citations, tables, and figures explicitly in HTML instead of assuming a Markdown engine with hidden extensions.
3. Keep article-local SVG figures as external files under the article root's `assets/` folder, with source declarations and intermediate build data under `plan/`. Validate them for structural issues and regenerate them when their inputs change.
4. Maintain a bibliography cache per source, including fetched source material and checked claim records, so repeated article builds remain rigorous and incremental.
5. Treat article publication as an agent-orchestrated workflow; do not expose it as a generic npm shortcut or CLI workflow. The agent must be able to revise plans, bibliography metadata, and source assets when validation finds substantive problems.
