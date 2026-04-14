function roundNumber(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? '');

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(',')
  );

  return [header, ...body].join('\n');
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.header).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(column.value(row))).join(' | ')} |`
  );

  return [header, separator, ...body].join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { escapeHtml, roundNumber, toCsv, toMarkdownTable };
