const STAGE_ORDER = [
  'source',
  'observation',
  'induction',
  'neighborhood',
  'frontier',
  'equivalence',
  'questioning',
  'novelty',
  'alignment',
  'completed'
];

const COLUMN_BY_TYPE = {
  segment: 0,
  cue: 1,
  hypothesis: 2,
  'base-theory': 3,
  theory: 4,
  domain: 5,
  equivalence: 6,
  question: 7,
  answer: 8,
  step: 8,
  novelty: 9,
  update: 9
};

const STAGE_SPANS = {
  source: [0, 0],
  observation: [1, 2],
  induction: [3, 3],
  neighborhood: [3, 4],
  frontier: [4, 5],
  equivalence: [6, 6],
  questioning: [7, 8],
  novelty: [9, 9],
  alignment: [9, 9],
  completed: [8, 9]
};

const GRAPH_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'source', label: 'Source' },
  { id: 'observation', label: 'Observation' },
  { id: 'theories', label: 'Theories' },
  { id: 'frontier', label: 'Frontier' },
  { id: 'question', label: 'Question' },
  { id: 'outcome', label: 'Outcome' }
];

const FILTER_STAGE = {
  all: 'all',
  source: 'source',
  observation: 'observation',
  theories: 'neighborhood',
  frontier: 'frontier',
  question: 'questioning',
  outcome: 'completed'
};

const DOMAIN_COLORS = {
  package: '#9f5b34',
  sample: '#2f6c71',
  manuscript: '#5f5d9a',
  procurement: '#6d7a41',
  maintenance: '#7a6c5e',
  incident: '#8d4f4d',
  compliance: '#6d7a41',
  quality: '#6d7a41',
  logistics: '#9f5b34',
  hiring: '#5f5d9a',
  shared: '#7a6c5e',
  question: '#2f6c71',
  yes: '#6d7a41',
  no: '#8d4f4d',
  mixed: '#7a6c5e',
  novelty: '#8d4f4d',
  update: '#8d4f4d'
};

const NODE_STYLES = {
  segment: { shape: 'rect', width: 180, height: 56 },
  cue: { shape: 'diamond', width: 86, height: 86 },
  hypothesis: { shape: 'circle', radius: 30 },
  'base-theory': { shape: 'circle', radius: 32 },
  theory: { shape: 'circle', radius: 28 },
  domain: { shape: 'pill', width: 132, height: 42 },
  equivalence: { shape: 'hexagon', width: 130, height: 58 },
  question: { shape: 'rect', width: 188, height: 62 },
  answer: { shape: 'pill', width: 104, height: 38 },
  step: { shape: 'pill', width: 100, height: 34 },
  novelty: { shape: 'triangle', width: 96, height: 80 },
  update: { shape: 'rect', width: 148, height: 54 }
};

const NODE_GUIDES = {
  segment: 'Literal source segment from the experiment input.',
  cue: 'Explicit or inferred cue lifted from the input.',
  hypothesis: 'One observational hypothesis over the same report.',
  'base-theory': 'Base local theory induced for a domain.',
  theory: 'Neighbor theory related by local symbolic moves.',
  domain: 'Retained domain mass on the frontier.',
  equivalence: 'Observer-relative quotient-like grouping.',
  question: 'Best discriminating question still available.',
  answer: 'One answer branch predicted for the selected question.',
  update: 'Frontier state after applying an answer.',
  novelty: 'Novelty or false-closure warning overlay.'
};

const SUMMARY_ARRAY_BLACKLIST = new Set(['caseRows', 'stepRows', 'benchmarkDomains']);

const state = {
  experiments: [],
  experimentDetailsById: new Map(),
  currentExperimentId: null,
  currentRun: null,
  currentTrace: null,
  currentCnl: null,
  currentRaw: null,
  activeTab: 'about',
  graphFilter: 'all',
  selectedNodeId: null,
  zoom: 0.88,
  graphFontScale: 1,
  graphLayout: null
};

const elements = {
  aboutContent: document.getElementById('about-content'),
  centerStageButton: document.getElementById('center-stage-button'),
  exampleSelect: document.getElementById('example-select'),
  experimentSelect: document.getElementById('experiment-select'),
  experimentSummary: document.getElementById('experiment-summary'),
  fontInButton: document.getElementById('font-in-button'),
  fontOutButton: document.getElementById('font-out-button'),
  fullscreenButton: document.getElementById('fullscreen-button'),
  graphCanvas: document.getElementById('graph-canvas'),
  graphFilters: document.getElementById('graph-filters'),
  graphStage: document.getElementById('graph-stage'),
  graphSummary: document.getElementById('graph-summary'),
  graphViewport: document.getElementById('graph-viewport'),
  mainTabs: [...document.querySelectorAll('.main-tab')],
  resetViewButton: document.getElementById('reset-view-button'),
  resultShell: document.getElementById('result-shell'),
  resultsContent: document.getElementById('results-content'),
  runButton: document.getElementById('run-button'),
  runContent: document.getElementById('run-content'),
  selectedNodePanel: document.getElementById('selected-node-panel'),
  status: document.getElementById('status'),
  tabPanels: {
    about: document.getElementById('tab-about'),
    results: document.getElementById('tab-results'),
    run: document.getElementById('tab-run'),
    graph: document.getElementById('tab-graph')
  },
  zoomInButton: document.getElementById('zoom-in-button'),
  zoomOutButton: document.getElementById('zoom-out-button')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json'
    },
    ...options
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatLabel(value) {
  return String(value ?? '')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric)) {
    return String(numeric);
  }

  if (Math.abs(numeric) >= 1000 || (Math.abs(numeric) > 0 && Math.abs(numeric) < 0.01)) {
    return numeric.toExponential(2);
  }

  return String(Number(numeric.toFixed(digits)));
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'n/a';
  }

  return `${formatNumber(Number(value) * 100, 1)}%`;
}

function clipWords(text, count = 8) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length <= count) {
    return words.join(' ');
  }

  return `${words.slice(0, count).join(' ')}...`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setStatus(message) {
  elements.status.textContent = message;
}

function currentExperiment() {
  return state.experimentDetailsById.get(state.currentExperimentId) ?? null;
}

function currentExample() {
  return currentExperiment()?.examples?.find((entry) => entry.id === elements.exampleSelect.value) ?? null;
}

function toneColor(domainId) {
  return DOMAIN_COLORS[domainId] ?? DOMAIN_COLORS.shared;
}

function renderMetricGrid(entries) {
  const items = safeArray(entries).filter((entry) => entry && entry.value !== null && entry.value !== undefined);
  if (!items.length) {
    return '<p class="muted">No metrics.</p>';
  }

  return `<div class="metric-grid">${items
    .map(
      (entry) => `
        <div class="metric-card">
          <span>${escapeHtml(entry.label)}</span>
          <strong>${escapeHtml(entry.formatted ?? String(entry.value))}</strong>
          ${entry.note ? `<small class="muted">${escapeHtml(entry.note)}</small>` : ''}
        </div>
      `
    )
    .join('')}</div>`;
}

function renderBarList(entries) {
  const items = safeArray(entries);
  if (!items.length) {
    return '<p class="muted">No distribution available.</p>';
  }

  return `<div class="bar-list">${items
    .map((entry) => {
      const color = toneColor(entry.domainId ?? entry.answer ?? entry.id);
      return `
        <div class="bar-row">
          <div class="bar-head">
            <strong>${escapeHtml(entry.label)}</strong>
            <span>${escapeHtml(entry.formatted ?? formatPercent(entry.value))}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${escapeHtml(String(clamp(entry.value * 100, 0, 100)))}%;background:${escapeHtml(
              color
            )}"></div>
          </div>
        </div>
      `;
    })
    .join('')}</div>`;
}

function renderPillRow(values) {
  const items = safeArray(values).filter(Boolean);
  if (!items.length) {
    return '<p class="muted">None.</p>';
  }

  return `<div class="pill-row">${items.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join('')}</div>`;
}

function renderMarkdown(markdown) {
  const lines = String(markdown ?? '').split('\n');
  const chunks = [];
  let paragraph = [];
  let listItems = [];
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    chunks.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) {
      return;
    }

    chunks.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    listItems = [];
  }

  function flushCode() {
    if (!codeLines.length) {
      return;
    }

    chunks.push(`<div class="raw-box"><pre>${escapeHtml(codeLines.join('\n'))}</pre></div>`);
    codeLines = [];
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,4}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      const level = trimmed.match(/^#+/)[0].length;
      chunks.push(`<h${level}>${escapeHtml(trimmed.replace(/^#{1,4}\s+/, ''))}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*]\s+/, ''));
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();

  return `<div class="markdown-render">${chunks.join('')}</div>`;
}

function renderSimpleTable(title, rows, limit = 10) {
  const visibleRows = safeArray(rows).slice(0, limit);
  if (!visibleRows.length || typeof visibleRows[0] !== 'object' || Array.isArray(visibleRows[0])) {
    return '';
  }

  const columns = Object.keys(visibleRows[0]).slice(0, 8);
  return `
    <article class="table-card">
      <div class="row-head">
        <h3>${escapeHtml(formatLabel(title))}</h3>
        <span class="muted">${escapeHtml(`${safeArray(rows).length} rows`)}</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(formatLabel(column))}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${visibleRows
              .map(
                (row) => `
                  <tr>
                    ${columns
                      .map((column) => {
                        const value = row[column];
                        return `<td>${escapeHtml(
                          typeof value === 'number'
                            ? formatNumber(value)
                            : value === null || value === undefined
                              ? 'n/a'
                              : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)
                        )}</td>`;
                      })
                      .join('')}
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function summaryTableBlocks(summary) {
  if (!summary || typeof summary !== 'object') {
    return '';
  }

  return Object.entries(summary)
    .filter(([key, value]) => Array.isArray(value) && value.length && !SUMMARY_ARRAY_BLACKLIST.has(key))
    .map(([key, value]) => renderSimpleTable(key, value, 8))
    .filter(Boolean)
    .join('');
}

function renderArtifactLinks(artifactLinks) {
  const grouped = {
    figure: [],
    table: [],
    json: [],
    markdown: [],
    cnl: [],
    file: []
  };

  safeArray(artifactLinks).forEach((artifact) => {
    (grouped[artifact.kind] ?? grouped.file).push(artifact);
  });

  return `
    <div class="artifact-grid">
      ${Object.entries(grouped)
        .filter(([, artifacts]) => artifacts.length)
        .map(
          ([kind, artifacts]) => `
            <article class="artifact-card">
              <div class="row-head">
                <h3>${escapeHtml(formatLabel(kind))}</h3>
                <span class="muted">${escapeHtml(`${artifacts.length} files`)}</span>
              </div>
              <div class="pill-row">
                ${artifacts
                  .map(
                    (artifact) =>
                      `<a class="artifact-link pill" href="${artifact.url}" target="_blank" rel="noreferrer">${escapeHtml(
                        artifact.fileName
                      )}</a>`
                  )
                  .join('')}
              </div>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderFigures(artifactLinks) {
  const figures = safeArray(artifactLinks).filter((artifact) => artifact.kind === 'figure');
  if (!figures.length) {
    return '';
  }

  return `
    <div class="artifact-grid">
      ${figures
        .map(
          (figure) => `
            <article class="artifact-card figure-card">
              <div class="row-head">
                <h3>${escapeHtml(figure.fileName)}</h3>
                <a class="artifact-link" href="${figure.url}" target="_blank" rel="noreferrer">Open raw</a>
              </div>
              <img src="${figure.url}" alt="${escapeHtml(figure.fileName)}" />
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function topAlternative() {
  return safeArray(state.currentRun?.views?.frontierBoard?.domainDistribution)[1] ?? null;
}

function currentQuestion() {
  return state.currentRun?.views?.questionPartition?.recommendedQuestion ?? null;
}

function currentUpdate() {
  return state.currentRun?.views?.questionPartition?.questionUpdate ?? null;
}

function renderExperimentSelect() {
  elements.experimentSelect.innerHTML = state.experiments
    .map((entry) => {
      const selected = entry.id === state.currentExperimentId ? 'selected' : '';
      return `<option value="${escapeHtml(entry.id)}" ${selected}>${escapeHtml(entry.title)}</option>`;
    })
    .join('');
}

function renderExampleSelect() {
  const experiment = currentExperiment();
  const examples = safeArray(experiment?.examples);

  elements.exampleSelect.innerHTML = examples
    .map((entry) => {
      const selected = entry.id === (elements.exampleSelect.value || experiment?.defaultExampleId) ? 'selected' : '';
      return `<option value="${escapeHtml(entry.id)}" ${selected}>${escapeHtml(entry.label)}</option>`;
    })
    .join('');

  if (!elements.exampleSelect.value && experiment?.defaultExampleId) {
    elements.exampleSelect.value = experiment.defaultExampleId;
  }
}

function renderExperimentSummary() {
  const experiment = currentExperiment();
  const example = currentExample();

  if (!experiment) {
    elements.experimentSummary.innerHTML = '';
    return;
  }

  elements.experimentSummary.innerHTML = `
    <div class="hero-card accent">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(experiment.title)}</h2>
          <p>${escapeHtml(experiment.description ?? '')}</p>
        </div>
        <span class="microcopy">${escapeHtml(`${experiment.examples.length} real examples · ${experiment.artifactLinks.length} artifacts`)}</span>
      </div>
      ${renderMetricGrid([
        { label: 'Selected example', value: example?.label ?? 'n/a', note: example?.subtitle ?? '' },
        { label: 'Default example', value: experiment.defaultExampleId ?? 'n/a' }
      ])}
    </div>
  `;
}

function renderTabs() {
  elements.mainTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });

  for (const [tabId, panel] of Object.entries(elements.tabPanels)) {
    panel.classList.toggle('active', tabId === state.activeTab);
  }
}

function renderAboutTab() {
  const experiment = currentExperiment();
  const example = currentExample();

  if (!experiment) {
    elements.aboutContent.innerHTML = '<div class="section-card"><p class="muted">No experiment selected.</p></div>';
    return;
  }

  elements.aboutContent.innerHTML = `
    <div class="hero-card accent">
      <h2>${escapeHtml(experiment.title)}</h2>
      <p>The text below is loaded directly from <code>experiments/${escapeHtml(experiment.id)}/description.md</code>.</p>
      ${renderMetricGrid([
        { label: 'Selected example', value: example?.label ?? 'n/a', note: example?.subtitle ?? '' },
        { label: 'Ground truth', value: example?.groundTruthDomain ? formatLabel(example.groundTruthDomain) : 'n/a' }
      ])}
    </div>
    <article class="section-card">
      ${renderMarkdown(experiment.descriptionMarkdown)}
    </article>
    <article class="section-card teal">
      <h3>Example text</h3>
      <div class="raw-box"><pre>${escapeHtml(example?.inputText ?? '')}</pre></div>
    </article>
    ${renderArtifactLinks(experiment.artifactLinks)}
  `;
}

function renderResultsTab() {
  const experiment = currentExperiment();

  if (!experiment) {
    elements.resultsContent.innerHTML = '<div class="section-card"><p class="muted">No experiment selected.</p></div>';
    return;
  }

  elements.resultsContent.innerHTML = `
    <div class="hero-card accent">
      <h2>Canonical results</h2>
      <p>The figures, tables, and report text below come from the generated files in <code>experiments/${escapeHtml(experiment.id)}/</code>.</p>
    </div>
    ${renderFigures(experiment.artifactLinks)}
    ${summaryTableBlocks(experiment.summary)}
    <article class="section-card">
      <h3>Results report</h3>
      ${renderMarkdown(experiment.resultsMarkdown)}
    </article>
    <article class="section-card">
      <h3>Raw summary.json</h3>
      <div class="json-box"><pre>${escapeHtml(JSON.stringify(experiment.summary, null, 2))}</pre></div>
    </article>
  `;
}

function renderBranchButtons() {
  const question = currentQuestion();
  if (!state.currentRun || !state.currentRun.canBranch || !question) {
    return '';
  }

  return `
    <div class="inline-actions">
      ${safeArray(question.answerClasses)
        .map(
          (answer) =>
            `<button type="button" class="branch-button" data-answer="${escapeHtml(answer)}">${escapeHtml(`Apply ${answer}`)}</button>`
        )
        .join('')}
    </div>
  `;
}

function renderRunTab() {
  const experiment = currentExperiment();
  const example = currentExample();

  if (!experiment || !example) {
    elements.runContent.innerHTML = '<div class="section-card"><p class="muted">Select an example.</p></div>';
    return;
  }

  if (!state.currentRun || state.currentRun.exampleId !== example.id) {
    elements.runContent.innerHTML = `
      <div class="hero-card accent">
        <h2>Ready to run</h2>
        <p>This example is taken directly from the experiment catalog, not from a demo-only scenario.</p>
        ${renderMetricGrid([
          { label: 'Example', value: example.label, note: example.subtitle ?? '' },
          { label: 'Ground truth', value: example.groundTruthDomain ? formatLabel(example.groundTruthDomain) : 'n/a' }
        ])}
      </div>
      <article class="section-card teal">
        <h3>Input text</h3>
        <div class="raw-box"><pre>${escapeHtml(example.inputText ?? '')}</pre></div>
      </article>
    `;
    return;
  }

  const distribution = safeArray(state.currentRun.views.frontierBoard?.domainDistribution);
  const question = currentQuestion();
  const update = currentUpdate();
  const alternative = topAlternative();
  const rawAnalysis = state.currentRaw?.bundle?.analysis ?? null;

  elements.runContent.innerHTML = `
    <div class="hero-card accent">
      <h2>Library run</h2>
      <p>The input and outputs below are the actual bundle returned by the library for this example.</p>
      ${renderMetricGrid([
        {
          label: 'Top domain',
          value: formatLabel(state.currentRun.quickStats.topDomain),
          note: alternative ? `Alternative kept: ${formatLabel(alternative.domainId)}` : 'No retained alternative'
        },
        { label: 'Top mass', value: formatPercent(state.currentRun.quickStats.topDomainWeight) },
        { label: 'Frontier width', value: state.currentRun.quickStats.frontierWidth },
        { label: 'Domain entropy', value: formatNumber(state.currentRun.quickStats.domainEntropy) }
      ])}
    </div>

    <div class="card-grid">
      <article class="section-card teal">
        <h3>Exact input text</h3>
        <div class="raw-box"><pre>${escapeHtml(state.currentRaw?.inputText ?? example.inputText ?? '')}</pre></div>
        ${renderPillRow(safeArray(state.currentRaw?.inputSegments).map((segment, index) => `Segment ${index + 1}: ${segment}`))}
      </article>
      <article class="section-card">
        <h3>Retained domains</h3>
        ${renderBarList(
          distribution.map((entry) => ({
            label: formatLabel(entry.domainId),
            value: entry.weight,
            domainId: entry.domainId
          }))
        )}
      </article>
    </div>

    ${
      question
        ? `
          <article class="section-card">
            <div class="row-head">
              <h3>Recommended question</h3>
              <span class="muted">${escapeHtml(question.id)}</span>
            </div>
            <p>${escapeHtml(question.prompt)}</p>
            ${renderMetricGrid([{ label: 'Information gain', value: formatNumber(question.informationGain) }])}
            ${renderBranchButtons()}
          </article>
        `
        : ''
    }

    ${
      update
        ? `
          <article class="section-card warning">
            <h3>Applied update</h3>
            ${renderMetricGrid([
              { label: 'Observed answer', value: formatLabel(update.observedAnswer) },
              { label: 'Domain entropy', value: `${formatNumber(update.domainEntropyBefore)} -> ${formatNumber(update.domainEntropyAfter)}` },
              { label: 'Theory entropy', value: `${formatNumber(update.theoryEntropyBefore)} -> ${formatNumber(update.theoryEntropyAfter)}` }
            ])}
          </article>
        `
        : ''
    }

    ${
      state.currentRaw?.steps?.length
        ? renderSimpleTable('step trace', state.currentRaw.steps, 12)
        : ''
    }

    <article class="section-card">
      <h3>Canonical CNL</h3>
      <div class="cnl-box"><pre>${escapeHtml(state.currentCnl?.canonicalCnl ?? '')}</pre></div>
    </article>

    <article class="section-card">
      <h3>Raw analysis JSON</h3>
      <div class="json-box"><pre>${escapeHtml(JSON.stringify(rawAnalysis, null, 2))}</pre></div>
    </article>
  `;

  elements.runContent.querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      branchCurrentRun(button.dataset.answer).catch((error) => {
        console.error(error);
        setStatus(error.message ?? 'Failed to apply branch.');
      });
    });
  });
}

function columnForNode(node) {
  return COLUMN_BY_TYPE[node.type] ?? 0;
}

function buildGraphLayout(graph) {
  const nodes = safeArray(graph?.nodes).map((node) => ({
    ...node,
    column: columnForNode(node)
  }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const columns = new Map();

  nodes
    .sort((left, right) => {
      const columnDelta = left.column - right.column;
      if (columnDelta !== 0) {
        return columnDelta;
      }

      const groupDelta = String(left.group).localeCompare(String(right.group));
      if (groupDelta !== 0) {
        return groupDelta;
      }

      return (left.order ?? 0) - (right.order ?? 0);
    })
    .forEach((node) => {
      const existing = columns.get(node.column) ?? [];
      existing.push(node);
      columns.set(node.column, existing);
    });

  let maxHeight = 980;

  for (const [column, columnNodes] of columns.entries()) {
    const groups = new Map();

    for (const node of columnNodes) {
      const key = node.group ?? 'shared';
      const existing = groups.get(key) ?? [];
      existing.push(node);
      groups.set(key, existing);
    }

    let y = 190;

    for (const groupNodes of groups.values()) {
      groupNodes.forEach((node, index) => {
        node.x = 170 + column * 280;
        node.y = y + index * 158;
      });

      y += groupNodes.length * 158 + 90;
    }

    maxHeight = Math.max(maxHeight, y + 190);
  }

  const edges = safeArray(graph?.edges).map((edge) => ({
    ...edge,
    source: nodesById.get(edge.from),
    target: nodesById.get(edge.to)
  }));

  const stageBounds = Object.fromEntries(
    Object.entries(STAGE_SPANS).map(([stageId, [startColumn, endColumn]]) => [
      stageId,
      {
        x1: 50 + startColumn * 280,
        x2: 300 + endColumn * 280
      }
    ])
  );

  return {
    width: 3120,
    height: maxHeight,
    nodes,
    nodesById,
    edges,
    stageBounds
  };
}

function stageRank(stageId) {
  return STAGE_ORDER.indexOf(stageId);
}

function wrapText(text, maxLength = 18, maxLines = 2) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (!lines.length) {
    lines.push(String(text ?? ''));
  }

  if (words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(maxLength - 1, 4))}…`;
  }

  return lines;
}

function nodeHeight(style) {
  if ('height' in style) {
    return style.height;
  }

  return style.radius * 2;
}

function nodeFill(node) {
  switch (node.type) {
    case 'segment':
      return '#7a6c5e';
    case 'cue':
      return '#9f5b34';
    case 'hypothesis':
      return toneColor(node.group ?? 'shared');
    case 'base-theory':
    case 'theory':
    case 'domain':
      return toneColor(node.group ?? node.label);
    case 'equivalence':
      return '#5f5d9a';
    case 'question':
      return '#2f6c71';
    case 'answer':
      return toneColor(node.group ?? node.label);
    case 'update':
    case 'novelty':
      return '#8d4f4d';
    default:
      return '#7a6c5e';
  }
}

function nodePresentation(node) {
  switch (node.type) {
    case 'segment':
      return {
        label: clipWords(node.detail, 6),
        meta: node.shortLabel ?? node.label
      };
    case 'cue':
      return {
        label: formatLabel(node.label),
        meta: node.subtitle
      };
    case 'hypothesis':
      return {
        label: node.group === 'shared' ? 'Base hypothesis' : `${formatLabel(node.group)} hypothesis`,
        meta: `${node.metrics?.cueCount ?? 0} cues`
      };
    case 'base-theory':
      return {
        label: `${formatLabel(node.group)} base`,
        meta: 'induced theory'
      };
    case 'theory':
      return {
        label: `${formatLabel(node.group)} ${formatLabel(node.subtitle)}`,
        meta: node.metrics?.frontier ? 'frontier' : 'neighbor'
      };
    case 'domain':
      return {
        label: formatLabel(node.label),
        meta: formatPercent(node.metrics?.weight)
      };
    case 'equivalence':
      return {
        label: formatLabel(node.label),
        meta: `${node.metrics?.theoryCount ?? 0} theories`
      };
    case 'question':
      return {
        label: 'Best question',
        meta: clipWords(node.detail, 6)
      };
    case 'answer':
      return {
        label: formatLabel(node.label),
        meta: formatPercent(node.metrics?.weight)
      };
    case 'update':
      return {
        label: `After ${formatLabel(node.shortLabel)}`,
        meta: 'updated frontier'
      };
    default:
      return {
        label: formatLabel(node.label),
        meta: node.subtitle ?? ''
      };
  }
}

function shapeMarkup(node, selected, dimmed, emphasis) {
  const style = NODE_STYLES[node.type] ?? NODE_STYLES.theory;
  const classes = ['graph-node'];
  const presentation = nodePresentation(node);
  const labelLines = wrapText(presentation.label, node.type === 'question' ? 22 : 18, 2);
  const metaLines = presentation.meta ? wrapText(presentation.meta, 18, 2) : [];
  const captionBaseY = node.y + nodeHeight(style) / 2 + 16;

  if (selected) {
    classes.push('selected');
  }

  if (dimmed) {
    classes.push('dimmed');
  }

  if (emphasis) {
    classes.push('emphasis');
  }

  const fill = nodeFill(node);
  let body = '';

  switch (style.shape) {
    case 'circle':
      body = `<circle class="graph-node-body" cx="${node.x}" cy="${node.y}" r="${style.radius}" fill="${fill}"></circle>`;
      break;
    case 'diamond':
      body = `<polygon class="graph-node-body" points="${node.x},${node.y - style.height / 2} ${node.x + style.width / 2},${node.y} ${node.x},${node.y + style.height / 2} ${node.x - style.width / 2},${node.y}" fill="${fill}"></polygon>`;
      break;
    case 'hexagon':
      body = `<polygon class="graph-node-body" points="${node.x - style.width / 2 + 16},${node.y - style.height / 2} ${node.x + style.width / 2 - 16},${node.y - style.height / 2} ${node.x + style.width / 2},${node.y} ${node.x + style.width / 2 - 16},${node.y + style.height / 2} ${node.x - style.width / 2 + 16},${node.y + style.height / 2} ${node.x - style.width / 2},${node.y}" fill="${fill}"></polygon>`;
      break;
    case 'triangle':
      body = `<polygon class="graph-node-body" points="${node.x},${node.y - style.height / 2} ${node.x + style.width / 2},${node.y + style.height / 2} ${node.x - style.width / 2},${node.y + style.height / 2}" fill="${fill}"></polygon>`;
      break;
    case 'pill':
      body = `<rect class="graph-node-body" x="${node.x - style.width / 2}" y="${node.y - style.height / 2}" width="${style.width}" height="${style.height}" rx="${style.height / 2}" fill="${fill}"></rect>`;
      break;
    default:
      body = `<rect class="graph-node-body" x="${node.x - style.width / 2}" y="${node.y - style.height / 2}" width="${style.width}" height="${style.height}" rx="14" fill="${fill}"></rect>`;
      break;
  }

  return `
    <g class="${classes.join(' ')}" data-node-id="${escapeHtml(node.id)}">
      ${body}
      ${labelLines
        .map(
          (line, index) =>
            `<text class="graph-node-caption" x="${node.x}" y="${captionBaseY + index * 14}">${escapeHtml(line)}</text>`
        )
        .join('')}
      ${metaLines
        .map(
          (line, index) =>
            `<text class="graph-node-meta" x="${node.x}" y="${
              captionBaseY + labelLines.length * 14 + 10 + index * 12
            }">${escapeHtml(line)}</text>`
        )
        .join('')}
    </g>
  `;
}

function pathForEdge(edge) {
  if (!edge.source || !edge.target) {
    return '';
  }

  const dx = Math.max((edge.target.x - edge.source.x) * 0.4, 96);
  return `M ${edge.source.x} ${edge.source.y} C ${edge.source.x + dx} ${edge.source.y}, ${edge.target.x - dx} ${edge.target.y}, ${edge.target.x} ${edge.target.y}`;
}

function selectedStage() {
  return FILTER_STAGE[state.graphFilter] ?? 'all';
}

function nodeVisible(node) {
  const stageId = selectedStage();
  if (stageId === 'all') {
    return true;
  }

  const rank = stageRank(node.stage);
  return rank !== -1 && rank <= stageRank(stageId);
}

function edgeVisible(edge) {
  const stageId = selectedStage();
  if (stageId === 'all') {
    return true;
  }

  const rank = stageRank(edge.stage);
  return rank !== -1 && rank <= stageRank(stageId);
}

function nodeEmphasis(node) {
  const stageId = selectedStage();
  if (state.selectedNodeId && node.id === state.selectedNodeId) {
    return true;
  }

  if (stageId === 'all') {
    return Boolean(node.metrics?.frontier) || ['question', 'domain', 'update'].includes(node.type);
  }

  if (state.graphFilter === 'theories') {
    return ['base-theory', 'theory'].includes(node.type);
  }

  if (state.graphFilter === 'question') {
    return ['question', 'answer', 'domain'].includes(node.type);
  }

  if (state.graphFilter === 'outcome') {
    return ['domain', 'update', 'question'].includes(node.type);
  }

  return node.stage === stageId;
}

function buildGraphSvg(layout) {
  const visibleNodeIds = new Set(layout.nodes.filter(nodeVisible).map((node) => node.id));
  const visibleEdges = layout.edges.filter(
    (edge) => edge.source && edge.target && visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to) && edgeVisible(edge)
  );

  return `
    <svg class="graph-svg" viewBox="0 0 ${layout.width} ${layout.height}" style="width:${layout.width * state.zoom}px;height:${
      layout.height * state.zoom
    }px" xmlns="http://www.w3.org/2000/svg">
      ${STAGE_ORDER.map((stageId) => {
        const bounds = layout.stageBounds[stageId];
        const active = selectedStage() === stageId ? ' active' : '';
        return `
          <g>
            <rect class="graph-band${active}" x="${bounds.x1}" y="74" width="${bounds.x2 - bounds.x1}" height="${
              layout.height - 148
            }" rx="22"></rect>
            <text class="graph-stage-label" x="${bounds.x1 + 12}" y="58">${escapeHtml(formatLabel(stageId))}</text>
          </g>
        `;
      }).join('')}
      ${visibleEdges
        .map((edge) => {
          const classes = ['graph-edge', `type-${edge.type}`];
          if (state.selectedNodeId && (edge.from === state.selectedNodeId || edge.to === state.selectedNodeId)) {
            classes.push('emphasis');
          }
          return `<path class="${classes.join(' ')}" d="${pathForEdge(edge)}"></path>`;
        })
        .join('')}
      ${layout.nodes
        .filter((node) => visibleNodeIds.has(node.id))
        .map((node) => shapeMarkup(node, node.id === state.selectedNodeId, !nodeVisible(node), nodeEmphasis(node)))
        .join('')}
    </svg>
  `;
}

function renderGraphFilters() {
  elements.graphFilters.innerHTML = GRAPH_FILTERS.map((filter) => {
    const active = filter.id === state.graphFilter ? ' active' : '';
    return `<button type="button" class="filter-button${active}" data-graph-filter="${escapeHtml(filter.id)}">${escapeHtml(
      filter.label
    )}</button>`;
  }).join('');

  elements.graphFilters.querySelectorAll('[data-graph-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.graphFilter = button.dataset.graphFilter;
      renderGraphFilters();
      renderGraphTab();
      centerGraphFilter();
    });
  });
}

function renderGraphSummary() {
  if (!state.currentRun) {
    elements.graphSummary.innerHTML = '';
    return;
  }

  const question = currentQuestion();
  elements.graphSummary.innerHTML = `
    <div class="graph-summary-grid">
      <div class="metric-card">
        <span>Visible filter</span>
        <strong>${escapeHtml(formatLabel(state.graphFilter))}</strong>
      </div>
      <div class="metric-card">
        <span>Top domain</span>
        <strong>${escapeHtml(formatLabel(state.currentRun.quickStats.topDomain))}</strong>
      </div>
      <div class="metric-card">
        <span>Frontier width</span>
        <strong>${escapeHtml(String(state.currentRun.quickStats.frontierWidth))}</strong>
      </div>
      <div class="metric-card">
        <span>Next question</span>
        <strong>${escapeHtml(question ? clipWords(question.prompt, 6) : 'None')}</strong>
      </div>
    </div>
  `;
}

function selectedNode() {
  return state.graphLayout?.nodesById?.get(state.selectedNodeId) ?? null;
}

function renderSelectedNodePanel() {
  const node = selectedNode();

  if (!state.currentRun || !state.graphLayout || !node) {
    elements.selectedNodePanel.innerHTML = `
      <div class="node-card">
        <h3>Selected node</h3>
        <p class="muted">Click any node in the graph to inspect it.</p>
      </div>
    `;
    return;
  }

  const neighbors = state.graphLayout.edges
    .filter((edge) => edge.from === node.id || edge.to === node.id)
    .slice(0, 8)
    .map((edge) => {
      const otherId = edge.from === node.id ? edge.to : edge.from;
      return state.graphLayout.nodesById.get(otherId);
    })
    .filter(Boolean)
    .map((entry) => nodePresentation(entry).label);

  elements.selectedNodePanel.innerHTML = `
    <div class="node-card">
      <h3>${escapeHtml(nodePresentation(node).label)}</h3>
      <p>${escapeHtml(NODE_GUIDES[node.type] ?? 'Symbolic object.')}</p>
      <p class="muted">${escapeHtml(node.detail ?? '')}</p>
    </div>
    <div class="node-card">
      <h4>Metrics</h4>
      ${renderMetricGrid(
        Object.entries(node.metrics ?? {}).map(([key, value]) => ({
          label: formatLabel(key),
          value: typeof value === 'number' ? formatNumber(value) : String(value)
        }))
      )}
    </div>
    <div class="node-card">
      <h4>Connected objects</h4>
      ${renderPillRow(neighbors)}
    </div>
  `;
}

function renderGraphTab() {
  renderGraphFilters();
  renderGraphSummary();

  if (!state.currentRun || !state.graphLayout) {
    elements.graphCanvas.innerHTML = '<div class="section-card"><p class="muted">Run an example to see the graph.</p></div>';
    renderSelectedNodePanel();
    return;
  }

  elements.graphCanvas.innerHTML = buildGraphSvg(state.graphLayout);
  elements.graphCanvas.querySelectorAll('[data-node-id]').forEach((element) => {
    element.addEventListener('click', () => {
      state.selectedNodeId = element.dataset.nodeId;
      renderGraphTab();
      focusNode(state.selectedNodeId);
    });
  });

  renderSelectedNodePanel();
}

function centerGraphFilter() {
  if (!state.graphLayout) {
    return;
  }

  const stageId = selectedStage();
  if (stageId === 'all') {
    return;
  }

  const bounds = state.graphLayout.stageBounds[stageId];
  if (!bounds) {
    return;
  }

  elements.graphViewport.scrollTo({
    left: Math.max(((bounds.x1 + bounds.x2) / 2) * state.zoom - elements.graphViewport.clientWidth / 2, 0),
    behavior: 'smooth'
  });
}

function focusNode(nodeId) {
  const node = state.graphLayout?.nodesById?.get(nodeId);
  if (!node) {
    return;
  }

  elements.graphViewport.scrollTo({
    left: Math.max(node.x * state.zoom - elements.graphViewport.clientWidth / 2, 0),
    top: Math.max(node.y * state.zoom - elements.graphViewport.clientHeight / 2, 0),
    behavior: 'smooth'
  });
}

function defaultSelectedNodeId(run) {
  const graph = run?.views?.rulialGraph;
  if (!graph) {
    return null;
  }

  const questionNode = graph.nodes.find((node) => node.type === 'question');
  if (questionNode) {
    return questionNode.id;
  }

  const topDomainId = run.quickStats?.topDomain ? `domain:${run.quickStats.topDomain}` : null;
  if (topDomainId && graph.nodes.some((node) => node.id === topDomainId)) {
    return topDomainId;
  }

  return graph.nodes[0]?.id ?? null;
}

async function hydrateRunArtifacts(runId) {
  const [trace, cnl, raw] = await Promise.all([
    fetchJson(`/api/runs/${runId}/trace?detail=default`),
    fetchJson(`/api/runs/${runId}/cnl`),
    fetchJson(`/api/runs/${runId}/raw`)
  ]);

  state.currentTrace = trace;
  state.currentCnl = cnl;
  state.currentRaw = raw;
  state.graphLayout = buildGraphLayout(state.currentRun.views.rulialGraph);
}

async function runSelectedExample() {
  const experiment = currentExperiment();
  const example = currentExample();
  if (!experiment || !example) {
    return;
  }

  setStatus('Running example...');
  const run = await fetchJson('/api/runs', {
    method: 'POST',
    body: JSON.stringify({
      experimentId: experiment.id,
      exampleId: example.id
    })
  });

  state.currentRun = run;
  await hydrateRunArtifacts(run.runId);
  state.selectedNodeId = defaultSelectedNodeId(run);
  state.activeTab = 'run';
  state.graphFilter = 'all';
  renderAll();
  setStatus('Example loaded.');
}

async function branchCurrentRun(answer) {
  const question = currentQuestion();
  if (!state.currentRun || !question) {
    return;
  }

  setStatus(`Applying ${answer}...`);
  const run = await fetchJson(`/api/runs/${state.currentRun.runId}/branches`, {
    method: 'POST',
    body: JSON.stringify({
      observedAnswer: answer,
      questionId: question.id
    })
  });

  state.currentRun = run;
  await hydrateRunArtifacts(run.runId);
  state.selectedNodeId = defaultSelectedNodeId(run);
  renderAll();
  setStatus(`Applied ${answer}.`);
}

function clearRunState() {
  state.currentRun = null;
  state.currentTrace = null;
  state.currentCnl = null;
  state.currentRaw = null;
  state.graphLayout = null;
  state.selectedNodeId = null;
  state.graphFilter = 'all';
}

async function ensureExperimentDetails(experimentId) {
  if (!state.experimentDetailsById.has(experimentId)) {
    const details = await fetchJson(`/api/experiments/${experimentId}`);
    state.experimentDetailsById.set(experimentId, details);
  }

  return state.experimentDetailsById.get(experimentId);
}

async function selectExperiment(experimentId) {
  state.currentExperimentId = experimentId;
  await ensureExperimentDetails(experimentId);
  renderExperimentSelect();
  renderExampleSelect();
  clearRunState();
  renderAll();
  setStatus('Experiment ready. Run a real example.');
}

function renderAll() {
  document.documentElement.style.setProperty('--graph-font-scale', String(state.graphFontScale));
  renderExperimentSelect();
  renderExampleSelect();
  renderExperimentSummary();
  renderTabs();
  renderAboutTab();
  renderResultsTab();
  renderRunTab();
  renderGraphTab();
}

function bindEvents() {
  elements.experimentSelect.addEventListener('change', () => {
    selectExperiment(elements.experimentSelect.value).catch((error) => {
      console.error(error);
      setStatus(error.message ?? 'Failed to load experiment.');
    });
  });

  elements.exampleSelect.addEventListener('change', () => {
    clearRunState();
    renderAll();
    setStatus('Example selected. Press Run example.');
  });

  elements.runButton.addEventListener('click', () => {
    runSelectedExample().catch((error) => {
      console.error(error);
      setStatus(error.message ?? 'Failed to run example.');
    });
  });

  elements.mainTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      renderTabs();
      if (state.activeTab === 'graph') {
        centerGraphFilter();
      }
    });
  });

  elements.zoomInButton.addEventListener('click', () => {
    state.zoom = Math.min(state.zoom + 0.12, 1.8);
    renderGraphTab();
  });

  elements.zoomOutButton.addEventListener('click', () => {
    state.zoom = Math.max(state.zoom - 0.12, 0.55);
    renderGraphTab();
  });

  elements.fontInButton.addEventListener('click', () => {
    state.graphFontScale = Math.min(state.graphFontScale + 0.1, 1.8);
    renderGraphTab();
  });

  elements.fontOutButton.addEventListener('click', () => {
    state.graphFontScale = Math.max(state.graphFontScale - 0.1, 0.75);
    renderGraphTab();
  });

  elements.resetViewButton.addEventListener('click', () => {
    state.zoom = 0.88;
    state.graphFontScale = 1;
    renderGraphTab();
    centerGraphFilter();
  });

  elements.centerStageButton.addEventListener('click', () => {
    centerGraphFilter();
  });

  elements.fullscreenButton.addEventListener('click', async () => {
    if (elements.graphStage.requestFullscreen) {
      await elements.graphStage.requestFullscreen();
    }
  });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  elements.graphViewport.addEventListener('mousedown', (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originLeft = elements.graphViewport.scrollLeft;
    originTop = elements.graphViewport.scrollTop;
    elements.graphViewport.classList.add('dragging');
  });

  window.addEventListener('mousemove', (event) => {
    if (!dragging) {
      return;
    }

    elements.graphViewport.scrollLeft = originLeft - (event.clientX - startX);
    elements.graphViewport.scrollTop = originTop - (event.clientY - startY);
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    elements.graphViewport.classList.remove('dragging');
  });
}

async function initialize() {
  bindEvents();
  setStatus('Loading experiment catalog...');

  const listPayload = await fetchJson('/api/experiments');
  state.experiments = safeArray(listPayload.experiments);
  state.currentExperimentId = state.experiments[0]?.id ?? null;

  if (state.currentExperimentId) {
    await ensureExperimentDetails(state.currentExperimentId);
  }

  renderAll();
  setStatus('Catalog ready. Pick an experiment or run the selected example.');
}

initialize().catch((error) => {
  console.error(error);
  setStatus(error.message ?? 'Failed to initialize demo.');
});
