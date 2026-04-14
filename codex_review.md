# Codex Review

## Scope

I reviewed:

- `docs/specs/DS000` through `DS009`
- `src/`
- `experiments/`
- `docs/article/`
- `skills/article-build/`

I also ran `npm test` on 2026-04-14. The current test suite passes, so the issues below are mostly specification-fidelity and scientific-defensibility gaps, not immediate runtime breakages.

## Executive Summary

The repository is coherent and substantially closer to the declared architecture than many research-code projects. The main problems are not random bugs. They are contract mismatches:

1. The question-selection logic does not implement the entropy definition described in the specs and the article.
2. The implemented neighborhood is not actually `N(Oi)` around one observational hypothesis; it mixes theories induced from different hypotheses.
3. The article-build citation check is not genuinely source-backed verification, even though the specs, README, and skill description currently imply that it is.
4. The expanded benchmark path drifts away from the public usage contract by flattening segmented evidence and by not recording CNL-surface metadata in Experiments 4, 6, and 7.

Those four points matter more than cosmetic documentation drift, because they affect whether the project's scientific summary is strictly true as written.

## Findings

### 1. High: citation verification in `article-build` is not actually source-backed

Spec and docs currently claim source-backed checking:

- `docs/specs/DS004-article-synchronization.md:4-5,13,20,23-26`
- `README.md:80-82,109`
- `skills/article-build/SKILL.md:37-39,66-68`

Implementation behavior is weaker:

- `skills/article-build/bibliography.mjs:128-133` accepts a claim if it matches a manually-authored keyword profile.
- `skills/article-build/bibliography.mjs:207-215` silently falls back to `bootstrapText` when fetch fails.
- `skills/article-build/bibliography.mjs:283-319` never checks claim text against fetched passages, quotes, spans, or even the cached plain text; it only checks that a support profile matched.

Impact:

- The build can report claims as "verified" even when the source was not fetched.
- The scientific article can look citation-backed while the verification is really "claim matches manually-maintained keywords".
- This is the most serious article-defensibility gap in the repo.

Recommendation:

- Rename the current mechanism to `support-profile validation` unless it becomes source-backed.
- Fail hard on fetch/cache absence for publication builds.
- Store supporting source snippets or passage offsets in `checks.json`.
- Distinguish `bootstrap-supported`, `cached-source-supported`, and `manually-waived` statuses in the manifest.

### 2. High: question selection does not implement the DS002 / article entropy definition

The spec and article define question utility over retained-domain entropy:

- `docs/specs/DS002-data-model.md:51-59`
- `docs/article/plan/chapters/ch3-data-model.md:27-29`

The code computes question utility over retained theories, not retained domains:

- `src/core/questioning.mjs:28-61`
- `src/core/questioning.mjs:79-84`

The stable CNL surface also omits the domain answer map and the induced partition that DS002 says belong to a `DiscriminatingQuestion`:

- `docs/specs/DS002-data-model.md:51-59,63`
- `src/usage/libraryUsage.mjs:427-443`

Impact:

- Domains with more retained variants can be overweighted during question selection.
- The article currently describes one algorithm while the code runs another.
- Canonical CNL cannot fully reconstruct why a question was selected or how answers partition the frontier.

Recommendation:

- Compute `IG(q)` over `domainDistribution`, not over theory weights.
- Serialize `QUESTION_ANSWER` or equivalent CNL lines for `domain -> answer`.
- Serialize the induced frontier partition explicitly, not just `QUESTION_CLASS`.

### 3. High: the implemented neighborhood is not `N(Oi)` around one observational hypothesis

DS002 defines:

- `N(Oi)` as the local neighborhood around one observational hypothesis: `docs/specs/DS002-data-model.md:11-14,43-49`

Implementation:

- `src/core/theory.mjs:31-38` selects a different best hypothesis per domain.
- `src/core/theory.mjs:217-218` induces one theory per domain from that per-domain selection.
- `src/pipeline/analyze.mjs:54-72` builds one frontier from the mixed set.

Runtime check on the default ambiguous example confirmed that a single frontier contains theories from `rich-package`, `rich-sample`, and `rich-manuscript`, not from one `Oi`.

Impact:

- The formal object described in the spec/article is stricter than the object implemented in code.
- Robust consequences, equivalence classes, and question selection are computed over a mixed-hypothesis frontier, not over one hypothesis-local neighborhood.
- The article chapter on the data model currently reads as if the implementation preserves the stricter object.

Recommendation:

- Either implement true per-hypothesis neighborhoods and then a separate cross-hypothesis aggregation layer, or
- revise DS002 and chapter 3 to describe the current object honestly as a cross-hypothesis retained frontier.

### 4. Medium: cue provenance does not preserve source spans as specified

The spec requires source-span provenance at cue level:

- `docs/specs/DS002-data-model.md:16`
- `docs/specs/DS006-library-usage.md:15-22,31-34`

Implementation stores matched phrases or inference-rule IDs instead:

- `src/core/observation.mjs:4-24`
- `src/core/observation.mjs:73`
- `src/usage/libraryUsage.mjs:264-285`

Observed runtime shape for a cue on the ambiguous example:

- `sources: ["registered"]`

Impact:

- Cue provenance is weaker than the stated audit model.
- Canonical CNL records `PROVENANCE source="registered"` rather than a span or segment-local evidence locator.
- Later human review cannot reliably map a cue back to exact evidence coordinates.

Recommendation:

- Store segment ID plus character span for each explicit cue match.
- Distinguish provenance kinds, e.g. `matched-span`, `inference-rule`.
- Emit span-aware `PROVENANCE` CNL lines.

### 5. Medium: the expanded benchmark path stops exercising the full usage contract

Specs emphasize preserving segmented evidence and recording CNL-facing metadata:

- `docs/specs/DS003-experimental-protocol.md:30-32`
- `docs/specs/DS006-library-usage.md:7-24`
- `docs/specs/DS007-usage-best-practices.md:7-15,23-25`

But the shared benchmark helper flattens segmented evidence before calling `analyzeEvidence(...)`:

- `experiments/shared/benchmarkAnalysis.mjs:10-12`
- `experiments/shared/benchmarkAnalysis.mjs:23-39`

Runtime check confirms benchmark bundles come through as `mode: "text"` with a single segment.

Experiments 4, 6, and 7 also omit usage-surface metadata from their rows/summaries:

- `experiments/experiment4/run.mjs:23-55`
- `experiments/experiment6/run.mjs:75-97,101-120`
- `experiments/experiment7/run.mjs:124-159`

By contrast, earlier experiments explicitly record usage-contract information.

Impact:

- The later validation ladder is no longer measuring the strongest public contract the specs describe.
- Segment boundaries, source trace structure, and canonical run metadata are lost in the benchmark-heavy experiments.
- This weakens the claim that the experiments validate the stable public surface rather than repository-private behavior.

Recommendation:

- Pass `segments` into `analyzeEvidence(...)` for benchmark runs.
- Record `usageMode`, `run.id`, and at least a compact CNL coverage summary in Experiments 4, 6, and 7.
- Keep segment-aware traces in the CSV outputs, not only in the source dataset.

### 6. Medium: `features.alignment = false` does not, by itself, remove alignment from ranking

DS002 says:

- when alignment is disabled, its utility should be removed from weighted ranking: `docs/specs/DS002-data-model.md:61`
- chapter 3 repeats the same claim: `docs/article/plan/chapters/ch3-data-model.md:29`

Implementation:

- `src/pipeline/analyze.mjs:13-33` disables only the emitted `alignments` array.
- `src/core/theory.mjs:40-71` still computes `alignmentUtility`.
- `src/config/analysisPolicy.mjs:1-30,64-81` keeps the default score weights unless the caller explicitly overrides them.

Runtime probe on the ambiguous example:

- `features.alignment=false` produced identical frontier scores and membership, while only `alignments` became empty.

Experiment 4 works around this by zeroing the weight manually:

- `experiments/experiment4/run.mjs:192-198`

Impact:

- The feature flag does not mean what the spec and article say it means.
- A host application can think alignment was removed from ranking when it was not.

Recommendation:

- Make `createAnalysisPolicy()` zero the normalized `alignmentUtility` weight automatically when `features.alignment === false`.

### 7. Medium: LLM routing metadata drifts from DS005

DS005 requires specific routing metadata:

- `docs/specs/DS005-llm-model-strategy.md:9-14,28,35-38`

Current routing metadata differs:

- `src/llm/taskRouting.mjs:1-13` uses intents `normalize-observation-input` and `conceptualize-analysis-result` instead of `normalize-ingestion` and `conceptual-explanation`.
- Required tags also differ from the spec.
- `src/llm/service.mjs:68-75` does not return selected tier and tags explicitly in the top-level result shape.

Impact:

- The LLM contract is internally consistent, but it is not the contract documented in DS005.
- External tooling that expects the documented intents/tags will drift.

Recommendation:

- Align the task-route table with DS005 exactly, or revise DS005 to match the implemented contract.
- Surface `selectedTier` and `tags` directly in the result object.

### 8. Low: `experiments/README.md` is stale relative to the seven-experiment ladder

- The repo now has seven experiments, but `experiments/README.md:5` still only describes Experiments 1 and 2.

Impact:

- Low technical risk, but it increases the chance of downstream documentation drift.

Recommendation:

- Update the README to summarize all seven experiments and their roles in the ladder.

## Skill-Specific Risks

These are not full spec violations by themselves, but they are meaningful risks in the article workflow.

### A. `svgValidation.mjs` is heuristic, not semantic

Evidence:

- `skills/article-build/svgValidation.mjs:173-187`
- `skills/article-build/svgValidation.mjs:272-279`

Why it matters:

- Chart-title detection only catches large text near the top.
- Complex legends, subtle overlaps, semantic mislabeling, or malformed connectors in more complex SVGs can pass validation.

Recommendation:

- Treat SVG validation as a guardrail, not as proof of figure quality.
- Add fixture-based tests for known bad SVG patterns.

### B. The generated article exposes a print button, but not an inline notice about browser-managed headers/footers

Evidence:

- Requirement: `docs/specs/DS004-article-synchronization.md:15,26`
- Skill rule: `skills/article-build/SKILL.md:68`
- Generated HTML/button: `skills/article-build/renderHtml.mjs:449-460`

Why it matters:

- The limitation is documented in repo specs, but not visible to a reader of the generated article itself.
- Users may assume the print/export path fully controls browser headers and footers.

Recommendation:

- Add one short inline note near the print button or in the article footer.

## Suggested Validation Experiments

Only two, both high-yield.

### 1. Leave-one-domain-family-out transfer

Goal:

- Test whether the frontier logic still behaves sensibly when one entire workflow family is absent from the domain bundles during training/design-time.

Why this helps:

- It is a stronger novelty/transfer test than synonym noise.
- It separates "memorized cue lexicon coverage" from the claimed uncertainty-management behavior.

Minimal design:

- Hold out one benchmark family at a time from the active domain set.
- Run the held-out family plus normal in-domain cases.
- Measure open-set candidate rate, false-closure rate, frontier width, and question availability.

### 2. Human auditability comparison from DS009

Goal:

- Validate the central practical claim that retained-frontier outputs are easier to inspect and revise than forced single-theory outputs.

Why this helps:

- It tests the user-facing value proposition directly, not just model behavior on synthetic metrics.

Minimal design:

- Reuse 12-20 ambiguous traces from Experiments 2, 3, and 6.
- Show each evaluator two output modes for the same trace: frontier report vs forced single-theory report.
- Ask which output better supports uncertainty justification, next action selection, and change tracking after an update.

## Human Validation Plan

This is the simplest human-validation DS I would recommend.

### Participants

- 3-5 technical readers are enough for a first pass.
- They do not need to be domain experts in every workflow family.

### Materials

- 12-20 traces total.
- For each trace:
  - original segmented evidence
  - frontier report
  - forced single-theory report
  - optional post-question update

### Procedure

For each trace, ask the evaluator to score both outputs on a 1-5 scale for:

1. How well the output justifies current uncertainty.
2. How useful the proposed next step/question is.
3. How easy it is to locate why one family was retained or removed.

Also collect one short free-text comment:

- "What was easiest to trust?"
- "What was hardest to verify?"

### Success Criteria

- Frontier report wins on at least 2 of the 3 criteria on most traces.
- Negative comments are clustered enough to become concrete backlog items.
- Evaluator disagreement is reported explicitly, not averaged away.

### Lightweight Execution

- This can be run in a single 30-45 minute session per evaluator.
- A simple spreadsheet or form is enough for the first pass.
- Store the raw ratings and comments under `experiments/` before claiming the study was run.

## Closing Assessment

The project is in a good state structurally. The core issue is not lack of engineering discipline; the core issue is that several scientific and auditability claims are currently a bit ahead of the exact implemented contract. If the repo fixes the questioning semantics, the mixed-hypothesis neighborhood wording, and the article-build citation verification, the overall package becomes much more defensible without changing its basic direction.
