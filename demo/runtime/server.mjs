import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEvidenceUpdate, createTraceCollector } from '../../src/index.mjs';
import { getExperimentDetails, listExperiments, runExperimentExample } from './experimentRegistry.mjs';
import { compressTrace } from './traceCompression.mjs';
import { buildRunResponse, buildRunSummary, buildRunViews } from './viewModels.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../..');
const publicRoot = resolve(repoRoot, 'demo', 'public');
const experimentsRoot = resolve(repoRoot, 'experiments');
const articleRoot = resolve(repoRoot, 'docs', 'article');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function safeJson(value) {
  return JSON.stringify(value);
}

function contentTypeFor(filePath) {
  return MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
}

function createRunIdFactory() {
  let counter = 0;
  return () => `demo-run-${String(++counter).padStart(4, '0')}`;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  response.end(safeJson(payload));
}

function sendError(response, statusCode, error) {
  sendJson(response, statusCode, {
    error: error.message ?? String(error)
  });
}

async function sendFile(response, filePath) {
  const content = await readFile(filePath);
  response.writeHead(200, {
    'content-type': contentTypeFor(filePath)
  });
  response.end(content);
}

function resolveWithin(baseDir, ...parts) {
  const resolved = resolve(baseDir, ...parts);

  if (!(resolved === baseDir || resolved.startsWith(`${baseDir}/`))) {
    throw new Error('Requested path escapes the allowed base directory.');
  }

  return resolved;
}

function canBranch(bundle) {
  const question = bundle?.analysis?.neighborhood?.recommendedQuestion;
  const queryBudgetLimit = bundle?.run?.queryBudgetLimit;
  const queryBudgetConsumed = bundle?.run?.queryBudgetConsumed ?? 0;

  return Boolean(question) && (queryBudgetLimit === null || queryBudgetLimit === undefined || queryBudgetConsumed < queryBudgetLimit);
}

function createStoredRun(result, overrides = {}) {
  const runRecord = {
    id: overrides.runId ?? result.bundle?.run?.id,
    experimentId: result.experimentId,
    title: result.title,
    description: result.description ?? '',
    exampleId: result.exampleId ?? null,
    example: result.example ?? null,
    bundle: result.bundle,
    trace: result.trace ?? { rawEvents: [], snapshots: [] },
    aggregateSummary: result.aggregateSummary ?? null,
    artifactLinks: result.artifactLinks ?? [],
    extra: result.extra ?? {},
    createdAt: new Date().toISOString(),
    parentRunId: overrides.parentRunId ?? result.bundle?.run?.parentRunId ?? null,
    branchTransition: overrides.branchTransition ?? result.bundle?.run?.branchTransition ?? null
  };

  runRecord.views = runRecord.bundle ? buildRunViews(runRecord) : {};
  runRecord.canBranch = canBranch(runRecord.bundle);
  return runRecord;
}

function createDemoServer({ host = '127.0.0.1', port = 4321 } = {}) {
  const runStore = new Map();
  const nextRunId = createRunIdFactory();

  async function storeExampleRun(experimentId, exampleId, overrides = {}) {
    const traceCollector = createTraceCollector({
      experimentId,
      exampleId
    });
    const runId = overrides.runId ?? nextRunId();
    const result = await runExperimentExample(experimentId, exampleId, {
      traceCollector,
      runId
    });
    const stored = createStoredRun(result, {
      runId,
      parentRunId: overrides.parentRunId,
      branchTransition: overrides.branchTransition
    });

    runStore.set(stored.id, stored);
    return stored;
  }

  async function createBranchRun(parentRun, payload = {}) {
    const runId = nextRunId();
    const traceCollector = createTraceCollector({
      experimentId: parentRun.experimentId,
      parentRunId: parentRun.id
    });
    const questionId = payload.questionId ?? parentRun.bundle?.analysis?.neighborhood?.recommendedQuestion?.id ?? null;

    if (!questionId) {
      throw new Error(`Run "${parentRun.id}" has no available question to answer.`);
    }

    if (payload.observedAnswer === undefined || payload.observedAnswer === null || payload.observedAnswer === '') {
      throw new Error(`Run "${parentRun.id}" needs an observed answer to branch.`);
    }

    const bundle = applyEvidenceUpdate(parentRun.bundle, payload.observedAnswer, {
      questionId,
      runId,
      parentRunId: parentRun.id,
      traceCollector,
      branchTransition: {
        kind: 'question-answer',
        questionId,
        observedAnswer: payload.observedAnswer
      }
    });
    const stored = createStoredRun(
      {
        experimentId: parentRun.experimentId,
        title: parentRun.title,
        description: parentRun.description,
        exampleId: parentRun.exampleId,
        example: parentRun.example,
        bundle,
        trace: traceCollector.exportTrace(),
        aggregateSummary: parentRun.aggregateSummary,
        artifactLinks: parentRun.artifactLinks,
        extra: {
          ...parentRun.extra,
          parentRunId: parentRun.id
        }
      },
      {
        runId,
        parentRunId: parentRun.id,
        branchTransition: {
          kind: 'question-answer',
          questionId,
          observedAnswer: payload.observedAnswer
        }
      }
    );

    runStore.set(stored.id, stored);
    return stored;
  }

  async function handleApi(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/experiments') {
      sendJson(response, 200, {
        experiments: await listExperiments()
      });
      return true;
    }

    const experimentMatch = url.pathname.match(/^\/api\/experiments\/([^/]+)$/);

    if (request.method === 'GET' && experimentMatch) {
      sendJson(response, 200, await getExperimentDetails(experimentMatch[1]));
      return true;
    }

    if (request.method === 'POST' && url.pathname === '/api/runs') {
      const body = await readJsonBody(request);
      const run = await storeExampleRun(body.experimentId, body.exampleId);

      sendJson(response, 201, buildRunResponse(run));
      return true;
    }

    const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);

    if (request.method === 'GET' && runMatch) {
      const run = runStore.get(runMatch[1]);

      if (!run) {
        sendError(response, 404, new Error(`Unknown run "${runMatch[1]}".`));
        return true;
      }

      sendJson(response, 200, buildRunResponse(run));
      return true;
    }

    const rawMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/raw$/);

    if (request.method === 'GET' && rawMatch) {
      const run = runStore.get(rawMatch[1]);

      if (!run) {
        sendError(response, 404, new Error(`Unknown run "${rawMatch[1]}".`));
        return true;
      }

      sendJson(response, 200, {
        runId: run.id,
        example: run.example,
        bundle: run.bundle,
        inputText: run.extra?.inputText ?? '',
        inputSegments: run.extra?.inputSegments ?? [],
        rawDocuments: run.extra?.rawDocuments ?? {},
        expectedQuestionId: run.extra?.expectedQuestionId ?? null,
        expectedAnswer: run.extra?.expectedAnswer ?? null,
        steps: run.extra?.steps ?? []
      });
      return true;
    }

    const traceMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/trace$/);

    if (request.method === 'GET' && traceMatch) {
      const run = runStore.get(traceMatch[1]);

      if (!run) {
        sendError(response, 404, new Error(`Unknown run "${traceMatch[1]}".`));
        return true;
      }

      const detail = url.searchParams.get('detail') ?? 'default';

      sendJson(response, 200, {
        runId: run.id,
        detail,
        events: compressTrace(run.trace, detail),
        snapshots: run.trace.snapshots
      });
      return true;
    }

    const streamMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/stream$/);

    if (request.method === 'GET' && streamMatch) {
      const run = runStore.get(streamMatch[1]);

      if (!run) {
        sendError(response, 404, new Error(`Unknown run "${streamMatch[1]}".`));
        return true;
      }

      const detail = url.searchParams.get('detail') ?? 'default';
      const events = compressTrace(run.trace, detail);

      response.writeHead(200, {
        'cache-control': 'no-cache',
        'content-type': 'text/event-stream; charset=utf-8',
        connection: 'keep-alive'
      });
      response.write(`event: init\ndata: ${safeJson(buildRunSummary(run))}\n\n`);

      for (const event of events) {
        response.write(`event: trace\ndata: ${safeJson(event)}\n\n`);
      }

      response.write('event: end\ndata: {}\n\n');
      response.end();
      return true;
    }

    const branchMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/branches$/);

    if (request.method === 'POST' && branchMatch) {
      const parentRun = runStore.get(branchMatch[1]);

      if (!parentRun) {
        sendError(response, 404, new Error(`Unknown run "${branchMatch[1]}".`));
        return true;
      }

      const body = await readJsonBody(request);
      const run = await createBranchRun(parentRun, body);

      sendJson(response, 201, buildRunResponse(run));
      return true;
    }

    const cnlMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/cnl$/);

    if (request.method === 'GET' && cnlMatch) {
      const run = runStore.get(cnlMatch[1]);

      if (!run) {
        sendError(response, 404, new Error(`Unknown run "${cnlMatch[1]}".`));
        return true;
      }

      sendJson(response, 200, {
        runId: run.id,
        canonicalCnl: run.bundle?.canonicalCnl ?? '',
        canonicalFamilies: run.bundle?.canonicalFamilies ?? [],
        familyIndex: run.views?.familyIndex ?? {}
      });
      return true;
    }

    return false;
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);

      if (url.pathname.startsWith('/api/')) {
        const handled = await handleApi(request, response, url);

        if (!handled) {
          sendError(response, 404, new Error(`Unknown API path "${url.pathname}".`));
        }

        return;
      }

      const artifactMatch = url.pathname.match(/^\/artifacts\/([^/]+)\/([^/]+)$/);

      if (artifactMatch) {
        await sendFile(response, resolveWithin(experimentsRoot, artifactMatch[1], artifactMatch[2]));
        return;
      }

      if (url.pathname === '/article' || url.pathname === '/article/') {
        await sendFile(response, resolveWithin(articleRoot, 'index.html'));
        return;
      }

      if (url.pathname.startsWith('/article/')) {
        await sendFile(response, resolveWithin(articleRoot, `.${url.pathname.slice('/article'.length)}`));
        return;
      }

      const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
      await sendFile(response, resolveWithin(publicRoot, `.${requestedPath}`));
    } catch (error) {
      sendError(response, error.code === 'ENOENT' ? 404 : 500, error);
    }
  });

  return {
    host,
    port,
    server,
    start() {
      return new Promise((resolveStart) => {
        server.listen(port, host, () => {
          const address = server.address();
          resolveStart({
            host: typeof address === 'object' && address ? address.address : host,
            port: typeof address === 'object' && address ? address.port : port
          });
        });
      });
    },
    stop() {
      return new Promise((resolveStop, rejectStop) => {
        server.close((error) => {
          if (error) {
            rejectStop(error);
            return;
          }

          resolveStop();
        });
      });
    }
  };
}

export { createDemoServer };
