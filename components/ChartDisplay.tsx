'use client';

import { memo, useCallback, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import type { AnalysisResponse } from '@/types';
import EmptyState from './EmptyState';

// ─── Design tokens ────────────────────────────────────────────────────────────

const INDIGO = '#4f46e5';
const INDIGO_LIGHT = '#818cf8';
const PIE_PALETTE = ['#4f46e5', '#818cf8', '#6366f1', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
const TICK_STYLE = { fill: '#6b7280', fontSize: 11 };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartDisplayProps {
  response: AnalysisResponse | null;
  loading?: boolean;
  error?: string | null;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
      {/* Answer text skeleton */}
      <div className="space-y-2 px-1 py-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-4/5 rounded bg-gray-100" />
        <div className="h-3 w-3/5 rounded bg-gray-100" />
      </div>
      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <div className="h-8 bg-gray-50" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 border-t border-gray-50 bg-white" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-56 rounded-lg bg-gray-50" />
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      {label && <p className="mb-1 font-semibold text-gray-700">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-medium text-gray-800">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Pie label ────────────────────────────────────────────────────────────────

function renderPieLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  percent: number;
  name: string;
}) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#6b7280" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
}

// ─── Filtered data table ──────────────────────────────────────────────────────

function FilteredTable({ data, xKey, yKey }: { data: Record<string, unknown>[]; xKey: string; yKey: string }) {
  if (!data.length) return null;
  const headers = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label="Filtered analysis results">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className={`whitespace-nowrap py-2 pr-6 text-left text-xs font-semibold uppercase tracking-wide ${
                  h === xKey || h === yKey ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="group border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              {headers.map((h) => (
                <td key={h} className="whitespace-nowrap py-2 pr-6 text-gray-700">
                  {String(row[h] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart builder ────────────────────────────────────────────────────────────

function buildChart(response: AnalysisResponse): React.ReactNode | null {
  const { chartType, chartData, chartConfig } = response;
  const { xKey, yKey } = chartConfig;

  if (!chartData.length) return null;

  const axisProps = {
    tick: TICK_STYLE,
    axisLine: { stroke: '#e5e7eb' },
    tickLine: false as const,
  };

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="35%">
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={44} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey={yKey} fill={INDIGO} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={44} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={INDIGO}
            strokeWidth={2}
            dot={{ fill: INDIGO, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: INDIGO_LIGHT, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={yKey}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={110}
            labelLine={false}
            label={renderPieLabel as React.ComponentProps<typeof Pie>['label']}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#6b7280' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'table') {
    return <FilteredTable data={chartData} xKey={xKey} yKey={yKey} />;
  }

  return null;
}

// ─── Export helper (unchanged) ────────────────────────────────────────────────

async function exportChartAsImage(container: HTMLDivElement, title: string) {
  const slug = title.replace(/\s+/g, '-').toLowerCase();
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${slug}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const ChartDisplay = memo(function ChartDisplay({
  response,
  loading = false,
  error,
}: ChartDisplayProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chart = useMemo(() => (response ? buildChart(response) : null), [response]);

  const handleExport = useCallback(() => {
    if (!chartRef.current || !response) return;
    exportChartAsImage(chartRef.current, response.chartConfig.title || 'chart');
  }, [response]);

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<AlertIcon />}
        title="Analysis failed"
        description={error}
        variant="error"
      />
    );
  }

  if (!response) {
    return (
      <EmptyState
        icon={<ChartBarIcon />}
        title="No analysis yet"
        description="Ask a question about your data to generate insights."
      />
    );
  }

  return (
    <div className="space-y-0">
      {/* Written answer */}
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-indigo-50 px-4 py-4">
        <SparkleIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <p className="text-sm leading-relaxed text-gray-700">{response.answer}</p>
      </div>

      {/* Filtered data table — directly answers the question */}
      {response.chartData.length > 0 && response.chartType !== 'none' && (
        <div className="rounded-t-xl border border-gray-100 bg-white px-4 py-3">
          <FilteredTable
            data={response.chartData}
            xKey={response.chartConfig.xKey}
            yKey={response.chartConfig.yKey}
          />
        </div>
      )}

      {/* Chart — flush below the table */}
      {chart && response.chartType !== 'table' && (
        <div
          ref={chartRef}
          className="rounded-b-xl border border-t-0 border-gray-100 bg-white px-4 pb-4 pt-2"
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">{response.chartConfig.title}</p>
            <button
              onClick={handleExport}
              aria-label="Export chart"
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <DownloadIcon className="h-3 w-3" />
              Export
            </button>
          </div>
          {chart}
        </div>
      )}

      {/* Table-type chart (no separate table above) */}
      {chart && response.chartType === 'table' && (
        <div className="rounded-b-xl border border-t-0 border-gray-100 bg-white px-4 pb-4 pt-1">
          {chart}
        </div>
      )}

      {response.chartType === 'none' && (
        <p className="mt-2 text-center text-xs text-gray-400">No chart generated for this query.</p>
      )}
    </div>
  );
});

export default ChartDisplay;

// ─── Icons ────────────────────────────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
