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
| `experiments/experiment2/` | Discriminating-question outputs, CSV tables, SVG figures, and generated Markdown report |
| `experiments/experiment3/` | Cue-masking baseline comparison, recovery outputs, SVG figures, and generated Markdown report |
| `docs/specs/` | Vision, architecture, data model, LLM strategy, library usage, best-practice, and article synchronization specs |
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

The current corpus contains 18 controlled workflow cases across package, sample, and manuscript domains. On Prefix 2, the rich observer improves mean top-domain accuracy from `0.333` to `0.833` and reduces mean frontier entropy from `1.245` to `0.344`. On ambiguous Prefix 2 traces, a single discriminating question lowers mean entropy from `1.244` to `0.652` while improving mean accuracy from `0.348` to `0.652`. Under cue masking at Prefix 2, both the lexical baseline and the single-theory baseline fall to `0.333`, while one frontier-guided question lifts end-to-end accuracy to `0.667`.

These numbers validate selected structural claims of the architecture on a controlled deterministic corpus. The current implementation establishes a reproducible baseline for a broader theoretical program rather than claiming exhaustive coverage of the full framework.

## Configuration and LLM support

Runtime configuration is created from environment variables and can then be overridden manually by the host application. The main entry points are exported from `src/config/runtimeConfig.mjs`.

Relevant environment variables include:

| Variable | Meaning |
| --- | --- |
| `AUTORESEARCHLIB_LLM_ENABLED` | Global LLM enable switch |
| `AUTORESEARCHLIB_LLM_INGESTION_ENABLED` | Allow optional ingestion normalization |
| `AUTORESEARCHLIB_LLM_CONCEPTUALIZATION_ENABLED` | Allow optional conceptual explanation |
| `AUTORESEARCHLIB_LLM_*_TIER` / `AUTORESEARCHLIB_LLM_*_MODEL` | Select tier and explicit model for each task family |
| `AUTORESEARCHLIB_ARTICLE_ROOT` | Override the default article root used by the article-build skill |
| `LLM_MODELS_CONFIG_PATH` | Override AchillesAgentLib model catalog path |

For article generation, the reusable workflow is described in `skills/article-build/SKILL.md`. The build is incremental: if the article-root plans, their declared dependencies, the bibliography source file, the bibliography verification caches, and the SVG inputs are unchanged, a second run leaves the generated chapter markdown files and HTML untouched. The intended way to trigger that workflow is through the agent, which can inspect the rebuilt article, revise plans when validation finds substantive gaps, and rerun the deterministic build until the article is defensible.
