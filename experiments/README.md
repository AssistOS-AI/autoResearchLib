# Experiments

This directory contains reproducible studies built on top of the core library. Each experiment writes structured JSON first, then derives CSV tables, SVG figures, and generated Markdown reports from the same data. The current ladder has seven roles:

1. `experiment1/` compares coarse and rich observers across segment depths.
2. `experiment2/` applies one discriminating question to the ambiguous cases that remain after analysis.
3. `experiment3/` compares retained-frontier recovery against earlier-collapse baselines under deterministic cue masking.
4. `experiment4/` stress-tests robustness through structural ablations, frontier-width changes, and nearby policy samples.
5. `experiment5/` evaluates transfer on the expanded seven-domain benchmark and now emits per-domain metrics, confusion counts, and failure analysis.
6. `experiment6/` studies open-set uncertainty on a broader unseen-and-hybrid novelty layer and reports false-closure risk explicitly.
7. `experiment7/` studies multi-step questioning budgets, step-level traces, and adversarial failure mechanics.

Each experiment also includes a `description.md` file so the article builder can distinguish between experiment intent and experiment results. Re-run everything with:

```bash
node scripts/run-experiments.mjs
```
