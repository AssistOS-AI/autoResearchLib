import { mkdir } from 'node:fs/promises';
import { runExperiment1 } from '../experiments/experiment1/run.mjs';
import { runExperiment2 } from '../experiments/experiment2/run.mjs';
import { runExperiment3 } from '../experiments/experiment3/run.mjs';

async function main() {
  const assetDir = new URL('../docs/assets/', import.meta.url);

  await mkdir(assetDir, { recursive: true });

  const experiment1 = await runExperiment1({ assetDir });
  const experiment2 = await runExperiment2({ assetDir });
  const experiment3 = await runExperiment3({ assetDir });

  console.log(
    `Generated experiment artifacts for ${experiment1.caseCount} observer-comparison cases, ${experiment2.caseCount} questioning traces, and ${experiment3.traceCount} robustness traces.`
  );
}

await main();
