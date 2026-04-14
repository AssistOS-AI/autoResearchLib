import { escapeHtml } from './tabular.mjs';

function niceMax(values, minimum = 1) {
  const maxValue = Math.max(minimum, ...values);
  const padded = maxValue * 1.1;

  return Math.ceil(padded * 10) / 10;
}

function axisTicks(maxValue, steps = 5) {
  return Array.from({ length: steps + 1 }, (_, index) => (maxValue / steps) * index);
}

function createVerticalLegend(series, x, startY) {
  return series
    .map((entry, index) => {
      const y = startY + index * 28;

      return `<g><rect x="${x}" y="${y - 10}" width="14" height="14" fill="${entry.color}" rx="2" /><text x="${x + 22}" y="${y + 1}" font-size="13" fill="#111827">${escapeHtml(entry.label)}</text></g>`;
    })
    .join('');
}

function createLineChartSvg({
  title,
  series,
  xValues,
  yMax
}) {
  const width = 820;
  const height = 420;
  const margin = { top: 28, right: 230, bottom: 54, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const computedYMax = yMax ?? niceMax(series.flatMap((entry) => entry.points.map((point) => point.y)));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xSpan = Math.max(1, xMax - xMin);
  const yTicks = axisTicks(computedYMax);

  const xPosition = (value) => margin.left + ((value - xMin) / xSpan) * plotWidth;
  const yPosition = (value) => margin.top + plotHeight - (value / computedYMax) * plotHeight;

  const grid = yTicks
    .map((tick) => {
      const y = yPosition(tick);

      return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e5e7eb" />`;
    })
    .join('');

  const lines = series
    .map((entry) => {
      const path = entry.points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xPosition(point.x).toFixed(2)} ${yPosition(point.y).toFixed(2)}`)
        .join(' ');
      const circles = entry.points
        .map(
          (point) =>
            `<circle cx="${xPosition(point.x).toFixed(2)}" cy="${yPosition(point.y).toFixed(2)}" r="4" fill="${entry.color}" />`
        )
        .join('');

      return `<path d="${path}" fill="none" stroke="${entry.color}" stroke-width="3" />${circles}`;
    })
    .join('');

  const xTicks = xValues
    .map((value) => {
      const x = xPosition(value);

      return `<g><line x1="${x}" y1="${margin.top + plotHeight}" x2="${x}" y2="${margin.top + plotHeight + 6}" stroke="#111827" /><text x="${x}" y="${height - 18}" text-anchor="middle" font-size="12" fill="#374151">${escapeHtml(value)}</text></g>`;
    })
    .join('');

  const yAxis = yTicks
    .map((tick) => {
      const y = yPosition(tick);

      return `<g><line x1="${margin.left - 6}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#111827" /><text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#374151">${tick.toFixed(1)}</text></g>`;
    })
    .join('');

  const legend = createVerticalLegend(series, width - margin.right + 18, margin.top + 14);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
  <rect width="${width}" height="${height}" fill="#ffffff" />
  ${legend}
  ${grid}
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#111827" />
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" stroke="#111827" />
  ${xTicks}
  ${yAxis}
  ${lines}
</svg>`;
}

function createGroupedBarChartSvg({
  title,
  categories,
  series,
  yMax
}) {
  const width = 820;
  const height = 420;
  const margin = { top: 28, right: 230, bottom: 54, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const computedYMax = yMax ?? niceMax(series.flatMap((entry) => entry.values));
  const yTicks = axisTicks(computedYMax);
  const groupWidth = plotWidth / categories.length;
  const barWidth = Math.min(40, (groupWidth * 0.75) / series.length);

  const yPosition = (value) => margin.top + plotHeight - (value / computedYMax) * plotHeight;

  const grid = yTicks
    .map((tick) => {
      const y = yPosition(tick);

      return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e5e7eb" />`;
    })
    .join('');

  const bars = categories
    .map((category, categoryIndex) => {
      const groupStart = margin.left + categoryIndex * groupWidth + groupWidth * 0.12;
      const seriesBars = series
        .map((entry, seriesIndex) => {
          const value = entry.values[categoryIndex];
          const heightValue = (value / computedYMax) * plotHeight;
          const x = groupStart + seriesIndex * (barWidth + 8);
          const y = margin.top + plotHeight - heightValue;

          return `<g><rect x="${x}" y="${y}" width="${barWidth}" height="${heightValue}" fill="${entry.color}" rx="3" /><text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#374151">${value.toFixed(2)}</text></g>`;
        })
        .join('');
      const labelX = groupStart + (series.length * barWidth + (series.length - 1) * 8) / 2;

      return `${seriesBars}<text x="${labelX}" y="${height - 18}" text-anchor="middle" font-size="12" fill="#374151">${escapeHtml(category)}</text>`;
    })
    .join('');

  const yAxis = yTicks
    .map((tick) => {
      const y = yPosition(tick);

      return `<g><line x1="${margin.left - 6}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#111827" /><text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#374151">${tick.toFixed(1)}</text></g>`;
    })
    .join('');

  const legend = createVerticalLegend(series, width - margin.right + 18, margin.top + 14);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
  <rect width="${width}" height="${height}" fill="#ffffff" />
  ${legend}
  ${grid}
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#111827" />
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" stroke="#111827" />
  ${yAxis}
  ${bars}
</svg>`;
}

export { createGroupedBarChartSvg, createLineChartSvg, niceMax };
