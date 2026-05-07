type CSVRow = Record<string, string>;

// ─── Types ────────────────────────────────────────────────────────────────────

type Metric = 'count' | 'sum_delay_hours' | 'avg_delay_hours' | 'sum_cost' | 'avg_cost';

interface DateFilter {
  month?: number;
  year?: number;
}

interface QueryIntent {
  dateFilter: DateFilter | null;
  columnFilters: Record<string, string>;
  statusFilter: string | null;
  groupBy: string | null;
  metric: Metric;
}

export interface GroupedRow {
  [key: string]: string | number;
  count: number;
  total_delay_hours: number;
  avg_delay_hours: number;
  total_cost: number;
  avg_cost: number;
  delayed_count: number;
}

export interface CalculationResult {
  value: number;
  description: string;
  groupedData?: GroupedRow[];
}

export interface AnalysisContext {
  filtered: CSVRow[];
  calculation: CalculationResult;
  summary: string;
  totalRows: number;
  matchedRows: number;
  intent: QueryIntent;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

const MONTH_LABELS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FILTERABLE_COLUMNS = ['route', 'carrier', 'origin', 'destination'];

// ─── Intent detection ─────────────────────────────────────────────────────────

function getLatestDate(rows: CSVRow[]): Date | null {
  const dates = rows
    .map((r) => new Date(r.actual_delivery_date ?? r.scheduled_date))
    .filter((d) => !isNaN(d.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function detectDateFilter(question: string, rows: CSVRow[]): DateFilter | null {
  const q = question.toLowerCase();

  for (const [name, month] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      const yearMatch = q.match(/20\d\d/);
      const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
      return { month, year };
    }
  }

  const latest = getLatestDate(rows);

  if (/\blast month\b|\bprevious month\b/.test(q) && latest) {
    const d = new Date(latest);
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  if (/\bthis month\b|\bcurrent month\b/.test(q) && latest) {
    return { month: latest.getMonth() + 1, year: latest.getFullYear() };
  }

  const yearOnlyMatch = q.match(/\b(20\d\d)\b/);
  if (yearOnlyMatch) {
    return { year: parseInt(yearOnlyMatch[1]) };
  }

  return null;
}

function detectColumnFilters(question: string, rows: CSVRow[]): Record<string, string> {
  const q = question.toLowerCase();
  const filters: Record<string, string> = {};

  for (const col of FILTERABLE_COLUMNS) {
    const uniqueValues = [...new Set(rows.map((r) => r[col]).filter(Boolean))];
    for (const val of uniqueValues) {
      if (q.includes(val.toLowerCase())) {
        filters[col] = val;
        break;
      }
    }
  }

  return filters;
}

function detectStatusFilter(question: string): string | null {
  const q = question.toLowerCase();
  if (/\bdelayed\b/.test(q)) return 'delayed';
  if (/\bdelivered\b/.test(q)) return 'delivered';
  if (/in[\s-]transit/.test(q)) return 'in-transit';
  if (/\bcancell?ed\b/.test(q)) return 'cancelled';
  return null;
}

function detectGroupBy(question: string): string | null {
  const q = question.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/by route|per route|each route|\broutes\b/, 'route'],
    [/by carrier|per carrier|each carrier|\bcarriers\b/, 'carrier'],
    [/by month|per month|monthly|each month/, 'month'],
    [/by status|per status|each status/, 'status'],
    [/by origin|per origin|each origin/, 'origin'],
    [/by destination|per destination|each destination/, 'destination'],
  ];
  for (const [re, col] of patterns) {
    if (re.test(q)) return col;
  }
  return null;
}

function detectMetric(question: string): Metric {
  const q = question.toLowerCase();
  const isCost = /\bcost\b|\bspend\b|\bexpensive\b|\bcheap\b|\bprice\b/.test(q);
  const isAvg = /\baverage\b|\bavg\b|\bmean\b/.test(q);
  const isCount = /\bhow many\b|\bcount\b|\bnumber of\b|\btotal shipments\b/.test(q);

  if (isCount) return 'count';
  if (isCost) return isAvg ? 'avg_cost' : 'sum_cost';
  if (/\bdelay\b|\bdelayed\b|\bdelays\b/.test(q)) return isAvg ? 'avg_delay_hours' : 'sum_delay_hours';
  return 'count';
}

function detectIntent(question: string, rows: CSVRow[]): QueryIntent {
  return {
    dateFilter: detectDateFilter(question, rows),
    columnFilters: detectColumnFilters(question, rows),
    statusFilter: detectStatusFilter(question),
    groupBy: detectGroupBy(question),
    metric: detectMetric(question),
  };
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function filterData(rows: CSVRow[], intent: QueryIntent): CSVRow[] {
  let result = rows;

  if (intent.dateFilter) {
    const { month, year } = intent.dateFilter;
    result = result.filter((row) => {
      const dateStr = row.actual_delivery_date ?? row.scheduled_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (month !== undefined && d.getMonth() + 1 !== month) return false;
      if (year !== undefined && d.getFullYear() !== year) return false;
      return true;
    });
  }

  for (const [col, val] of Object.entries(intent.columnFilters)) {
    result = result.filter((row) => row[col] === val);
  }

  if (intent.statusFilter) {
    result = result.filter((row) => row.status === intent.statusFilter);
  }

  return result;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return `${MONTH_LABELS[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function aggregateGroup(groupRows: CSVRow[]): Omit<GroupedRow, string> {
  const count = groupRows.length;
  const totalDelay = groupRows.reduce((s, r) => s + (parseFloat(r.delay_hours) || 0), 0);
  const totalCost = groupRows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
  const delayedCount = groupRows.filter((r) => r.status === 'delayed').length;
  return {
    count,
    total_delay_hours: Math.round(totalDelay),
    avg_delay_hours: count > 0 ? Math.round((totalDelay / count) * 10) / 10 : 0,
    total_cost: Math.round(totalCost),
    avg_cost: count > 0 ? Math.round(totalCost / count) : 0,
    delayed_count: delayedCount,
  };
}

function metricSortKey(metric: Metric): keyof GroupedRow {
  switch (metric) {
    case 'sum_delay_hours': return 'total_delay_hours';
    case 'avg_delay_hours': return 'avg_delay_hours';
    case 'sum_cost': return 'total_cost';
    case 'avg_cost': return 'avg_cost';
    default: return 'count';
  }
}

function calculateGrouped(rows: CSVRow[], intent: QueryIntent): CalculationResult {
  const groupKey = intent.groupBy!;
  const groups = new Map<string, CSVRow[]>();

  for (const row of rows) {
    const key =
      groupKey === 'month'
        ? formatMonth(row.actual_delivery_date ?? row.scheduled_date)
        : (row[groupKey] ?? 'Unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const sortKey = metricSortKey(intent.metric);

  const groupedData: GroupedRow[] = Array.from(groups.entries())
    .map(([key, groupRows]) => ({ [groupKey]: key, ...aggregateGroup(groupRows) } as GroupedRow))
    .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  const top = groupedData[0];
  const description =
    `${rows.length} records grouped by ${groupKey}. ` +
    `${groupedData.length} groups. ` +
    `Top group: "${top?.[groupKey]}" with ${top?.[sortKey]} ${sortKey.replace(/_/g, ' ')}.`;

  return { value: groupedData.length, description, groupedData };
}

function calculateOverall(rows: CSVRow[], metric: Metric): CalculationResult {
  const count = rows.length;
  if (count === 0) return { value: 0, description: 'No matching records found.' };

  const totalDelay = rows.reduce((s, r) => s + (parseFloat(r.delay_hours) || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);

  switch (metric) {
    case 'sum_delay_hours':
      return {
        value: Math.round(totalDelay),
        description: `Total delay: ${Math.round(totalDelay)} hours across ${count} shipments.`,
      };
    case 'avg_delay_hours': {
      const avg = Math.round((totalDelay / count) * 10) / 10;
      return {
        value: avg,
        description: `Average delay: ${avg} hours across ${count} shipments.`,
      };
    }
    case 'sum_cost':
      return {
        value: Math.round(totalCost),
        description: `Total cost: ₹${Math.round(totalCost).toLocaleString()} across ${count} shipments.`,
      };
    case 'avg_cost': {
      const avg = Math.round(totalCost / count);
      return {
        value: avg,
        description: `Average cost: ₹${avg.toLocaleString()} across ${count} shipments.`,
      };
    }
    default:
      return { value: count, description: `Found ${count} matching shipments.` };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function analyzeQuery(question: string, csvData: CSVRow[]): AnalysisContext {
  const intent = detectIntent(question, csvData);
  const filtered = filterData(csvData, intent);
  const calculation =
    intent.groupBy && filtered.length > 0
      ? calculateGrouped(filtered, intent)
      : calculateOverall(filtered, intent.metric);

  const filterDesc = buildFilterDescription(intent);
  const summary =
    `Filters applied: ${filterDesc || 'none'}. ` +
    `Matched ${filtered.length} of ${csvData.length} total rows. ` +
    calculation.description;

  return {
    filtered: filtered.slice(0, 100),
    calculation,
    summary,
    totalRows: csvData.length,
    matchedRows: filtered.length,
    intent,
  };
}

function buildFilterDescription(intent: QueryIntent): string {
  const parts: string[] = [];
  if (intent.dateFilter) {
    const { month, year } = intent.dateFilter;
    if (month) parts.push(`${MONTH_LABELS[month]}${year ? ` ${year}` : ''}`);
    else if (year) parts.push(`year ${year}`);
  }
  for (const [col, val] of Object.entries(intent.columnFilters)) {
    parts.push(`${col}=${val}`);
  }
  if (intent.statusFilter) parts.push(`status=${intent.statusFilter}`);
  return parts.join(', ');
}
