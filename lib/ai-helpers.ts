import type { AnalysisResponse } from '@/types';

// Claude's context window is large, but sending thousands of raw rows is wasteful
// and pushes past practical prompt limits. We sample + summarise instead.
const MAX_ROWS_TO_SEND = 200;
const MAX_CELL_LENGTH = 100;

type CSVRow = Record<string, string>;

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isCSVRowArray(value: unknown): value is CSVRow[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      !Array.isArray(item) &&
      Object.values(item).every((v) => typeof v === 'string')
  );
}

export function isValidChartType(value: unknown): value is AnalysisResponse['chartType'] {
  return (
    typeof value === 'string' &&
    ['bar', 'line', 'pie', 'table', 'none'].includes(value)
  );
}

export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isNonEmptyString(v.answer) &&
    isValidChartType(v.chartType) &&
    Array.isArray(v.chartData) &&
    typeof v.chartConfig === 'object' &&
    v.chartConfig !== null
  );
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function truncateCell(value: string): string {
  return value.length > MAX_CELL_LENGTH ? value.slice(0, MAX_CELL_LENGTH) + '…' : value;
}

function sanitizeRow(row: CSVRow): CSVRow {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim(), truncateCell(String(v).trim())])
  );
}

/**
 * Reduces a potentially large CSV dataset to a Claude-friendly prompt payload.
 *
 * Strategy:
 * - Always include the first 50 rows (representative head)
 * - Sample evenly from the remainder up to MAX_ROWS_TO_SEND total
 * - Append a summary block (row count, numeric column stats) so Claude can
 *   answer aggregate questions even when rows are truncated
 */
export function prepareDataForClaude(rows: CSVRow[]): {
  sample: CSVRow[];
  summary: string;
  wasTruncated: boolean;
} {
  const totalRows = rows.length;
  const wasTruncated = totalRows > MAX_ROWS_TO_SEND;

  let sample: CSVRow[];
  if (!wasTruncated) {
    sample = rows.map(sanitizeRow);
  } else {
    const head = rows.slice(0, 50).map(sanitizeRow);
    const rest = rows.slice(50);
    const remaining = MAX_ROWS_TO_SEND - 50;
    const step = Math.ceil(rest.length / remaining);
    const sampled = rest.filter((_, i) => i % step === 0).slice(0, remaining).map(sanitizeRow);
    sample = [...head, ...sampled];
  }

  const summary = buildSummary(rows, totalRows, wasTruncated);

  return { sample, summary, wasTruncated };
}

function buildSummary(rows: CSVRow[], totalRows: number, wasTruncated: boolean): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines: string[] = [
    `Total rows: ${totalRows}`,
    `Columns (${headers.length}): ${headers.join(', ')}`,
  ];

  if (wasTruncated) {
    lines.push(`Note: data was sampled to ${MAX_ROWS_TO_SEND} rows for this request.`);
  }

  // Per-column numeric stats for columns that are mostly numeric
  for (const h of headers) {
    const nums = rows
      .map((r) => parseFloat(r[h]))
      .filter((n) => !isNaN(n));

    if (nums.length < rows.length * 0.5) continue; // skip non-numeric columns

    const sum = nums.reduce((a, b) => a + b, 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = sum / nums.length;
    lines.push(
      `${h}: min=${min.toFixed(2)}, max=${max.toFixed(2)}, avg=${avg.toFixed(2)}, sum=${sum.toFixed(2)}`
    );
  }

  return lines.join('\n');
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildUserMessage(question: string, rows: CSVRow[]): string {
  const { sample, summary, wasTruncated } = prepareDataForClaude(rows);

  const dataSection = JSON.stringify(sample, null, 0);

  return [
    `Question: ${question}`,
    '',
    wasTruncated
      ? `CSV Data (sampled ${sample.length} of ${rows.length} rows):`
      : `CSV Data (${rows.length} rows):`,
    dataSection,
    '',
    'Dataset Summary:',
    summary,
  ].join('\n');
}
