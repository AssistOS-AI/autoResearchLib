# DS009 - Auditability Demo over Canonical Experiment Artifacts

## Introduction
The symbolic core, experiment ladder, usage contract, and cue provenance model are already defined elsewhere in the specs. The remaining human-facing requirement is not a second application with its own ontology, and not an evaluator-only side channel. It is a faithful browser over the canonical outputs already produced in `experiments/`, with the ability to rerun documented examples through the same public library API and inspect the resulting trace.

This DS therefore narrows the scope compared with earlier drafts. The repository should expose one dependency-free demo runtime that stays as close as possible to the same artifacts, datasets, and execution paths already used by the experiments, the article, and the tests. Optional human-study ideas may remain future work, but they are no longer part of the required architecture and should not leave dead plumbing, fake endpoints, or placeholder data directories in the repository.

## Core Content
The demo system is a thin Node.js layer over two canonical sources of truth:

1. generated experiment artifacts in `experiments/experiment*/`,
2. reproducible reruns through `analyzeEvidence(...)`, `applyEvidenceUpdate(...)`, and the shared experiment helpers under `experiments/shared/`.

The binding coherence constraints are:

| Upstream spec | Binding consequence for this DS |
| --- | --- |
| `DS001` | the UI must still expose the stage structure of the symbolic pipeline rather than collapsing everything into one score tile |
| `DS002` | the run surface must preserve budgets, retained frontier state, questions, updates, and canonical CNL |
| `DS003` | the browser must stay tied to the seven canonical experiments and their machine-readable outputs |
| `DS006` | live reruns must call the public usage helpers or the shared experiment helpers that call them |
| `DS007` | source text, segmentation, metadata, numeric summaries, and canonical CNL must remain inspectable together |
| `DS008` | the browser may show validated results and open limits, but only as secondary interpretation around the real outputs |
| `DS010` | question views must still be grounded in retained-domain mass and answer partitions |
| `DS012` | cue views must preserve provenance exactly as emitted by the core analysis bundle |

The preferred repository layout is now:

```text
demo/runtime/experimentRegistry.mjs
src/trace/traceCollector.mjs
demo/runtime/traceCompression.mjs
demo/runtime/viewModels.mjs
demo/runtime/server.mjs
scripts/run-demo.mjs
demo/public/index.html
demo/public/app.js
demo/public/styles.css
```

The important architectural rule is that `experimentRegistry.mjs` is a canonical artifact loader plus rerun dispatcher, not a family of hand-written demo adapters. It should:

1. read `description.md`, `results.md`, `summary.json`, CSV files, SVG files, and CNL examples directly from each experiment directory,
2. expose real documented examples derived from those outputs,
3. rerun those examples against `workflow-cases.json`, `readBenchmarkCases()`, `readNoveltyCases()`, `analyzeCasePrefix(...)`, `analyzeBenchmarkCase(...)`, and `runQuestionBudget(...)` instead of inventing demo-only inputs.

The server has three layers:

| Layer | Responsibility |
| --- | --- |
| Canonical experiment catalog | enumerate experiments, generated artifacts, and documented rerun examples |
| Traceable run engine | rerun one documented example, collect trace events, and support explicit answer branches |
| Demo API and UI | serve experiment documents, artifact links, raw bundles, traces, graphs, and the static browser UI |

The API surface should stay small:

| Method and path | Purpose |
| --- | --- |
| `GET /api/experiments` | list the seven experiments with counts and default example ids |
| `GET /api/experiments/:id` | return description text, results text, summary JSON, artifact links, and real example metadata |
| `POST /api/runs` | rerun one documented example from the canonical catalog |
| `GET /api/runs/:runId` | return run summary plus graph-friendly views |
| `GET /api/runs/:runId/raw` | return the exact bundle, input text, and raw supporting documents |
| `GET /api/runs/:runId/trace?detail=default` | return compressed or raw trace views |
| `GET /api/runs/:runId/stream` | stream run events when needed |
| `POST /api/runs/:runId/branches` | create a child run by applying an explicit answer to the current question |
| `GET /api/runs/:runId/cnl` | return canonical CNL and family index |

Study-session endpoints are intentionally absent. The demo should not expose `POST /api/study/*`, should not maintain `experiments/human-eval/`, and should not claim evaluator workflows that the repository does not actually use.

The run model remains immutable and branch-aware. A base run comes from one documented example. A child run is created only when the user applies an answer to an available question. This preserves provenance and lets the browser compare the pre-update and post-update frontier without mutating the parent run in place.

The UI should stay simple and honest. The default browser organization is four tabs:

| Tab | Purpose |
| --- | --- |
| `About` | show the real `description.md` text and the exact example text selected for rerun |
| `Results` | show generated figures, selected summary tables, raw artifact links, and the real `results.md` report |
| `Run` | show the exact input text plus the actual library bundle, canonical CNL, and raw JSON output |
| `Graph` | show the same run as a navigable rulial graph with stage focus, zoom, font controls, and fullscreen |

This ordering matters. The user should first understand what the experiment is, then what results were generated, then what one concrete rerun does, and only after that inspect the graph. The graph stays valuable, but it should no longer be the only meaningful surface.

The graph-first lens remains allowed, but only as a visualization over the real run bundle. It may visualize:

1. source segments as initial objects,
2. cues and hypotheses as lifted structure,
3. theories and transformations as a typed local neighborhood,
4. retained domains and equivalence classes as compressed frontier structure,
5. questions and answer updates as explicit branch morphisms.

It must still avoid stronger claims than the engine computes. The graph is explanatory geometry over the emitted symbolic objects, not a proof that the system already formalizes richer category-theoretic machinery than the code implements.

The canonical trace model from earlier versions of this DS still applies. Raw events remain authoritative, compressed traces remain the default presentation surface, and the browser should still expose stage milestones, cue clusters, variant fans, frontier changes, question selection, update application, and novelty overlays when those are present. What changes is the source of truth: traces now serve canonical reruns and experiment outputs directly rather than a separate demo representation stack.

## Conclusion
The correct demo for this repository is a browser over the real experiment corpus plus a rerun surface for real documented examples. It should load the same text, JSON, CSV, SVG, and CNL artifacts used by the article and validation ladder, rerun selected examples through the real library paths, preserve trace and branch lineage, and expose the result through a restrained UI that keeps raw input and output visible. Placeholder study plumbing, fake scenario adapters, and redundant demo-only data paths are out of scope.

### Critical Implementation Directives
1. Load experiment descriptions, reports, summaries, figures, tables, and usage examples directly from `experiments/`.
2. Rerun documented examples only through the real shared datasets and public library-facing analysis helpers.
3. Preserve trace collection, canonical CNL, raw JSON bundle inspection, and branch-aware updates.
4. Do not keep or reintroduce study endpoints, placeholder evaluator storage, or adapter-heavy demo-only scenario layers.
