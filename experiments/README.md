# Experiments

This directory contains reproducible studies built on top of the core library. Each experiment writes structured JSON first, then derives CSV tables, SVG figures, and a generated `results.md` report from the same data.

`experiment1/` compares coarse and rich observers across prefix depths. `experiment2/` applies discriminating questions to the ambiguous cases that remain after analysis. Each experiment now also includes a `description.md` file so the article builder can distinguish between experiment intent and experiment results. Re-run everything with:

```bash
node scripts/run-experiments.mjs
```
