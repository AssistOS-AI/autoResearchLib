# autoResearchLib

`autoResearchLib` is a Node.js reference implementation for a broader theoretical program: *A Meta-Rational Neuro-Symbolic Architecture for Ruliologic Exploration*. Its deterministic core remains dependency-free, while AchillesAgentLib is allowed as an optional integration for bounded LLM-assisted tasks around input normalization and conceptual explanation. The repository keeps a strict distinction between textual evidence, observational hypotheses, local theories, and the bounded frontier that remains plausible after scoring and questioning.

The repository now contains four synchronized layers. `docs/specs/` holds the design source of truth, `src/` implements the deterministic exploration engine, `experiments/` produces machine-readable outputs plus generated reports, and `docs/article/` contains an article root with `index.html`, `assets/`, and `plan/`.

## Using the library

The intended public entry point is the evidence-oriented usage layer rather than the lower-level analysis helpers. A host application supplies text or segments, source metadata, an observer profile, and optional budgets. The library returns the symbolic analysis together with a canonical CNL trace that preserves source context, observations, theories, transforms, consequences, questions, and updates.

```js
import { analyzeEvidence, applyEvidenceUpdate } from './src/index.mjs';

const bundle = analyzeEvidence(
  {
    sourceId: 'incident-17',
    segments: [
      'The item was registered and placed in the queue.',
      'A label was attached and the record was updated.'
    ],
    metadata: { caseId: 'incident-17', prefixDepth: 2 }
  },
  { observerId: 'rich' }
);

console.log(bundle.analysis.neighborhood.domainDistribution);
console.log(bundle.canonicalCnl);

if (bundle.analysis.neighborhood.recommendedQuestion) {
  const updated = applyEvidenceUpdate(bundle, 'yes');
  console.log(updated.canonicalCnl);
}
```

`analyzeText(...)` and `applyDiscriminatingAnswer(...)` remain available for internal or low-level consumers, but the stable comparison and audit surface of the repository is the canonical CNL bundle returned by `analyzeEvidence(...)` and `applyEvidenceUpdate(...)`.

## Architecture

The implementation follows four explicit stages.

1. Observational lifting converts text into explicit and inferred cues with provenance and observer-specific visibility.
2. Local theory induction matches those cues against reusable domain bundles and scores several compatible theories.
3. Local rulial exploration expands each theory into a neighborhood linked by refinement, coarsening, refactorization, and observer-relative equivalence.
4. Alignment, questioning, and update preserve a bounded frontier, compute discriminating questions, revise the frontier when an answer arrives, and serialize the result into a canonical audit surface.

Optional AchillesAgentLib-backed LLM support is available for two bounded tasks only: ingestion normalization and conceptual explanation of retained results. All library-managed LLM calls go through AchillesAgentLib `LLMAgent`, are tagged by task type, and remain disabled by default.

## Running the project

The project uses only built-in Node.js APIs for the deterministic path. AchillesAgentLib is resolved dynamically from `../AchillesAgentLib` first and falls back to the installed package path when optional LLM assistance is enabled.

```bash
npm test
npm run validate
```

The article build is intentionally agent-orchestrated through the reusable `article-build` skill. Publication builds are not exposed as npm shortcuts or documented as a CLI workflow because article repair, bibliography judgment, and figure review belong to the agent operating the skill rather than to a blind export command.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Core library, domain bundles, and reporting helpers |
| `tests/` | Node.js test suite for frontier behavior and experiment summaries |
| `data/inputs/` | Controlled workflow cases used by the reproducible experiments |
| `experiments/experiment1/` | Observer comparison outputs, CSV tables, SVG figures, and generated Markdown report |
| `experiments/experiment2/` | Single-step discriminating-question outputs, CSV tables, SVG figures, and generated Markdown report |
| `experiments/experiment3/` | Cue-masking baseline comparison and recovery outputs |
| `experiments/experiment4/` | Sensitivity-analysis and structural-ablation outputs |
| `experiments/experiment5/` | Expanded seven-domain benchmark outputs and external baseline comparisons |
| `experiments/experiment6/` | Open-set novelty and false-closure outputs |
| `experiments/experiment7/` | Multi-step questioning-budget and recoverability outputs |
| `docs/specs/` | Vision, architecture, data model, experimental protocol, article synchronization, LLM strategy, usage, and validation specs |
| `skills/article-build/` | Reusable article build skill implementation owned by the agent workflow |
| `docs/article/index.html` | Generated article built from chapter markdown, experiment outputs, and external SVGs |
| `docs/article/assets/` | Article-facing external SVG assets referenced by the generated HTML |
| `docs/article/plan/plan.md` | Global article vision and regeneration contract |
| `docs/article/plan/plan_ch*.md` | Detailed chapter plans with paragraph sourcing and generated chapter templates |
| `docs/article/plan/chapters/` | Generated Markdown chapters used as authoritative HTML inputs |
| `docs/article/plan/bibliography.md` | Editable bibliography source of truth consumed by the article-build skill |
| `docs/article/plan/bibliography/` | Cached source material and checked claims used during citation verification |
| `docs/article/plan/assets.json` | Declarative asset list that maps source SVGs into the article root |

## Current experimental signal

The repository now carries a seven-experiment validation ladder. The original three experiments still establish the structural core: richer observers contract the frontier earlier, one discriminating question lowers entropy on ambiguous traces, and retained frontiers preserve recoverability under cue masking. The newer experiments extend that claim in four directions.

1. Sensitivity and ablation show that the default deterministic policy is stable across a nearby region of parameter settings, while coarse observation, frontier-width changes, and removal of domain rescue visibly reduce frontier quality.
2. The expanded benchmark evaluates 102 benchmark cases over seven workflow families and three lexical strata. Frontier truth retention stays above frontier-top accuracy across all three strata, and the outputs now include per-domain precision, recall, F1, confusion counts, and mean truth rank.
3. The novelty study now uses a broader unseen-and-hybrid layer spanning clinical, legal, quality, logistics, hiring, and mixed traces. Open-set warnings and uncertainty rise on those traces much more often than on ordinary in-domain traces, while remaining explicitly weaker than full novel-theory synthesis.
4. The multi-step questioning study shows useful recovery under clean and noisy evidence, while adversarial answers remain a current weakness and are now reported with explicit failure mechanics rather than only aggregate accuracy.

These results support a stronger but still bounded claim: the current implementation is a reproducible theory-frontier engine with meaningful robustness, transfer, and uncertainty-management behavior. It is not yet a claim of full open-ended theory induction.

## Configuration and LLM support

Runtime configuration is created from environment variables and can then be overridden manually by the host application. The main entry points are exported from `src/config/runtimeConfig.mjs`.

Relevant environment variables include:

| Variable | Meaning |
| --- | --- |
| `AUTORESEARCHLIB_LLM_ENABLED` | Global LLM enable switch |
| `AUTORESEARCHLIB_LLM_INGESTION_ENABLED` | Allow optional ingestion normalization |
| `AUTORESEARCHLIB_LLM_CONCEPTUALIZATION_ENABLED` | Allow optional conceptual explanation |
| `AUTORESEARCHLIB_LLM_*_TIER` / `AUTORESEARCHLIB_LLM_*_MODEL` | Select tier and explicit model for each task family |
| `LLM_MODELS_CONFIG_PATH` | Override AchillesAgentLib model catalog path |

For article generation, the reusable workflow is described in `skills/article-build/SKILL.md`. The build is incremental: if the article-root plans, their declared or token-resolved dependencies, the bibliography source file, the bibliography verification caches, and the SVG inputs are unchanged, a second run leaves the generated chapter markdown files and HTML untouched. Bibliography checks are source-backed by default, can record snippet-level support, and distinguish explicit `manual-waived` references from ordinary cached-source support. The skill now works from explicit `articleRoot` and `baseDir` inputs rather than from repository runtime configuration, emits generator provenance into the HTML, and shows a visible note that browser-managed print headers or footers remain browser-controlled. The intended way to trigger that workflow is through the agent, which can inspect the rebuilt article, revise plans when validation finds substantive gaps, and rerun the deterministic build until the article is defensible.
