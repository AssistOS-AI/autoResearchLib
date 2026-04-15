import assert from 'node:assert/strict';
import test from 'node:test';
import { getExperimentDetails, listExperiments } from '../demo/runtime/experimentRegistry.mjs';
import { createDemoServer } from '../demo/runtime/server.mjs';

test('demo registry exposes canonical experiment records and real examples', async () => {
  const experiments = await listExperiments();
  const experiment4 = await getExperimentDetails('experiment4');
  const experiment7 = await getExperimentDetails('experiment7');

  assert.equal(experiments.length, 7);
  assert.ok(experiments.every((entry) => entry.exampleCount > 0));
  assert.ok(experiments.every((entry) => entry.defaultExampleId));
  assert.ok(experiment4.examples.some((entry) => entry.id.startsWith('ablation-')));
  assert.ok(experiment7.examples.some((entry) => entry.label.includes('budget')));
  assert.match(experiment4.descriptionMarkdown, /robustness/i);
  assert.match(experiment7.resultsMarkdown, /recoverability/i);
});

test('demo server serves the canonical browser UI and experiment/article routes', async () => {
  const demoServer = createDemoServer({ host: '127.0.0.1', port: 0 });
  const address = await demoServer.start();
  const baseUrl = `http://${address.host}:${address.port}`;

  try {
    const [htmlResponse, appResponse, articleResponse, catalog] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/app.js`),
      fetch(`${baseUrl}/article/`),
      fetch(`${baseUrl}/api/experiments`).then((response) => response.json())
    ]);
    const html = await htmlResponse.text();
    const appJs = await appResponse.text();
    const articleHtml = await articleResponse.text();

    assert.equal(htmlResponse.status, 200);
    assert.equal(appResponse.status, 200);
    assert.equal(articleResponse.status, 200);
    assert.match(html, /Canonical experiment browser/);
    assert.match(html, /About/);
    assert.match(html, /Results/);
    assert.match(html, /Run example/);
    assert.match(html, /Graph/);
    assert.match(appJs, /raw analysis json/i);
    assert.match(appJs, /requestFullscreen/);
    assert.match(articleHtml, /A Meta-Rational Neuro-Symbolic Architecture for Ruliologic Exploration/);
    assert.equal(catalog.experiments.length, 7);
  } finally {
    await demoServer.stop();
  }
});

test('demo server runs all default examples and exposes raw bundle data', async () => {
  const demoServer = createDemoServer({ host: '127.0.0.1', port: 0 });
  const address = await demoServer.start();
  const baseUrl = `http://${address.host}:${address.port}`;

  try {
    for (const experimentId of [
      'experiment1',
      'experiment2',
      'experiment3',
      'experiment4',
      'experiment5',
      'experiment6',
      'experiment7'
    ]) {
      const details = await fetch(`${baseUrl}/api/experiments/${experimentId}`).then((response) => response.json());
      const run = await fetch(`${baseUrl}/api/runs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          experimentId,
          exampleId: details.defaultExampleId
        })
      }).then((response) => response.json());

      assert.equal(run.experimentId, experimentId);
      assert.ok(run.description.length > 0);
      assert.ok(run.example);
      assert.ok(run.quickStats);
      assert.ok(run.views.evidenceRibbon);
      assert.ok(run.views.frontierBoard);
      assert.ok(run.views.rulialGraph.nodes.length > 0);
      assert.ok(run.artifactLinks.length > 0);

      const [trace, cnl, raw] = await Promise.all([
        fetch(`${baseUrl}/api/runs/${run.runId}/trace?detail=presentation`).then((response) => response.json()),
        fetch(`${baseUrl}/api/runs/${run.runId}/cnl`).then((response) => response.json()),
        fetch(`${baseUrl}/api/runs/${run.runId}/raw`).then((response) => response.json())
      ]);

      assert.ok(trace.events.some((event) => event.kind === 'run.started'));
      assert.ok(trace.snapshots.some((snapshot) => snapshot.stage === 'completed'));
      assert.ok(Object.keys(cnl.familyIndex).length > 0);
      assert.ok(raw.bundle.analysis);
      assert.ok(typeof raw.inputText === 'string');
      assert.ok(raw.rawDocuments.descriptionMarkdown.length > 0);

      if (run.canBranch) {
        const answer = run.views.questionPartition.recommendedQuestion.answerClasses[0];
        const branch = await fetch(`${baseUrl}/api/runs/${run.runId}/branches`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            observedAnswer: answer,
            questionId: run.views.questionPartition.recommendedQuestion.id
          })
        }).then((response) => response.json());

        assert.equal(branch.parentRunId, run.runId);
        assert.ok(branch.quickStats);
      }
    }
  } finally {
    await demoServer.stop();
  }
});

test('demo server no longer exposes study endpoints', async () => {
  const demoServer = createDemoServer({ host: '127.0.0.1', port: 0 });
  const address = await demoServer.start();
  const baseUrl = `http://${address.host}:${address.port}`;

  try {
    const response = await fetch(`${baseUrl}/api/study/sessions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        experimentId: 'experiment2'
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.match(payload.error, /Unknown API path/);
  } finally {
    await demoServer.stop();
  }
});
