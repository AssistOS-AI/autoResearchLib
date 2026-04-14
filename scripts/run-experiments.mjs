import { runExperiment1 } from '../experiments/experiment1/run.mjs';
import { runExperiment2 } from '../experiments/experiment2/run.mjs';
import { runExperiment3 } from '../experiments/experiment3/run.mjs';
import { runExperiment4 } from '../experiments/experiment4/run.mjs';
import { runExperiment5 } from '../experiments/experiment5/run.mjs';
import { runExperiment6 } from '../experiments/experiment6/run.mjs';
import { runExperiment7 } from '../experiments/experiment7/run.mjs';

async function main() {
  const experiment1 = await runExperiment1();
  const experiment2 = await runExperiment2();
  const experiment3 = await runExperiment3();
  const experiment4 = await runExperiment4();
  const experiment5 = await runExperiment5();
  const experiment6 = await runExperiment6();
  const experiment7 = await runExperiment7();

  console.log(
    `Generated experiment artifacts for ${experiment1.caseCount} observer cases, ${experiment2.caseCount} questioning traces, ${experiment3.traceCount} robustness traces, ${experiment4.traceCount} ablation traces, ${experiment5.traceCount} benchmark traces, ${experiment6.traceCount} novelty traces, and ${experiment7.traceCount} multi-step traces.`
  );
}

await main();
