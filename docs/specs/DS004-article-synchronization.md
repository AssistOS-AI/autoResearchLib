# DS004 - Article Synchronization

## Introduction
The article is a generated research artifact, not an independently maintained essay. Its credibility depends on clear provenance: conceptual claims come from DS files and chapter plans, quantitative claims come from experiment outputs, citations are checked against cached source material, and figures are emitted as external SVG assets validated for readability and structural integrity.

## Core Content
The article must remain theory-first. It is not a product page for `autoResearchLib`. The repository appears in the paper as a reference implementation and evidence source. The main-body narrative therefore explains the methodological problem, formal objects, algorithms, validation ladder, and current scope without drifting into file tours, module names, decision-log prose, or command-line usage notes. Project decisions remain in repository documentation, not in the article body.

The article root is intentionally self-contained. The reusable build skill works only from an explicit article root and its own local plan material; it must not import repository runtime configuration or other repository-private helpers. The expected visible surface is `index.html`, `assets/`, and `plan/`. The `plan/` folder remains the editable source of truth for `plan.md`, `plan_chN.md`, `bibliography.md`, `assets.json`, generated chapter markdown, bibliography caches, and build manifests.

Synchronization is strict. A change in any design specification used by a chapter, any experiment description or result artifact, any bibliography source file, any bibliography verification cache, any figure source, or any chapter-plan file requires the dependent chapter markdown or final HTML to be regenerated as appropriate. `plan/plan.md` is responsible for declaring the regeneration contract. The build manifest is responsible for recording what was refreshed and why.

The build workflow should remain deterministic while still supporting agent review. Deterministic steps generate chapter markdown, copy article-facing SVGs, verify citations, and render the final HTML. The agent layer remains responsible for deciding whether the article is actually defensible, whether a chapter plan needs revision, whether a bibliography entry is insufficiently supported, or whether a figure must be redesigned rather than merely copied.

The HTML renderer now has one additional publication responsibility: it should emit browser-side article controls, including a print or save-PDF button, without relying on third-party export libraries. That control may use ordinary browser print APIs and current CSS, but the documentation must remain honest about their limit. Standard browser APIs can encourage cleaner print output, yet they cannot guarantee suppression of browser-added header or footer metadata such as URL or print timestamp. The article should therefore provide the best native print path available while documenting that final header and footer behavior remains browser-controlled.

Figures and tables remain externalized and explicit. SVG diagrams must be separate files under `assets/`, not inline blobs hidden in the HTML. They must be validated for overlapping labels, disconnected connectors, impossible geometry, or chart titles embedded inside the SVG. Markdown tables remain part of generated chapter markdown and should always be introduced by prose that explains why the table matters. Citations should stay local to the ideas they support rather than appearing as undifferentiated citation bundles at the end of a sentence.

## Conclusion
The article should read like a real research paper because it is generated from stable plans, reproducible experiments, checked citations, and validated external figures. The right maintenance strategy is deterministic generation plus agent review, not hand-edited drift.

### Critical Implementation Directives
1. Build the article from chapter markdown generated from `plan/plan_chN.md`, experiment artifacts, bibliography metadata, and external SVG declarations under the article root.
2. Keep the article-build skill independent from repository runtime configuration and repository-private helper imports; it should operate from explicit `articleRoot` and `baseDir` inputs.
3. Validate all SVG assets and reject figures with overlapping labels, disconnected connectors, unreadable legends, or internal chart titles.
4. Emit browser-side print or save-PDF controls in the generated HTML, but document honestly that browser-managed print headers and footers are not fully controllable through standard web APIs.
5. Keep project decision logs, file-path commentary, and build-command explanations out of the article body.
