'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CSVUploader from '@/components/CSVUploader';
import DataTable from '@/components/DataTable';
import QueryInterface from '@/components/QueryInterface';
import ChartDisplay from '@/components/ChartDisplay';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { AnalysisResponse, ParsedCSVData } from '@/types';

// ─── Toast system (unchanged) ─────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const TOAST_DURATION = 4000;

function ToastBar({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            'pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
            t.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : t.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-indigo-200 bg-indigo-50 text-indigo-800',
          ].join(' ')}
        >
          <span className="mt-0.5 shrink-0">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '✕' : 'ℹ'}</span>
          <p>{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="ml-1 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return { toasts, push, dismiss };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onReset }: { onReset: () => void }) {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shrink-0">
          <TruckIcon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">Logistics AI</p>
          <p className="text-[11px] text-gray-400">Analyzer</p>
        </div>
      </div>

      {/* Single nav item */}
      <nav className="px-3 pt-4" aria-label="Main navigation">
        <button
          onClick={onReset}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeftUpIcon className="h-4 w-4 shrink-0 text-gray-400" />
          Upload New CSV
        </button>
      </nav>
    </aside>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<AnalysisResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // ── Data logic (completely unchanged) ────────────────────────────────────────

  const handleDataParsed = useCallback(
    (data: ParsedCSVData) => {
      setCsvData(data);
      setQueryResult(null);
      setQueryError(null);
      pushToast('success', `Loaded ${data.rows.length.toLocaleString()} rows across ${data.headers.length} columns.`);
    },
    [pushToast]
  );

  const handleUploadError = useCallback(
    (message: string) => {
      pushToast('error', message);
    },
    [pushToast]
  );

  const handleQuery = useCallback(
    async (question: string) => {
      if (!csvData) return;

      setQueryLoading(true);
      setQueryError(null);
      setQueryResult(null);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, csvData: csvData.rows }),
        });

        const body: unknown = await res.json();

        if (!res.ok) {
          const message =
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
              ? (body as { error: string }).error
              : 'Analysis failed. Please try again.';
          setQueryError(message);
          pushToast('error', message);
          return;
        }

        setQueryResult(body as AnalysisResponse);
        pushToast('success', 'Analysis complete.');
      } catch {
        const message = 'Network error. Please check your connection and try again.';
        setQueryError(message);
        pushToast('error', message);
      } finally {
        setQueryLoading(false);
      }
    },
    [csvData, pushToast]
  );

  const handleReset = useCallback(() => {
    setCsvData(null);
    setQueryResult(null);
    setQueryError(null);
  }, []);

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar onReset={handleReset} />

      <main className="flex-1 overflow-y-auto">
        {!csvData ? (
          <UploadScreen onDataParsed={handleDataParsed} onError={handleUploadError} />
        ) : (
          <DataScreen
            csvData={csvData}
            onSubmit={handleQuery}
            queryLoading={queryLoading}
            queryResult={queryResult}
            queryError={queryError}
          />
        )}
      </main>

      <ToastBar toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

// ─── Upload screen ────────────────────────────────────────────────────────────

function UploadScreen({
  onDataParsed,
  onError,
}: {
  onDataParsed: (d: ParsedCSVData) => void;
  onError: (m: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-md">
            <TruckIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics AI Analyzer</h1>
          <p className="mt-2 text-sm text-gray-500">Upload your shipment data to get AI-powered insights instantly.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <ErrorBoundary>
            <CSVUploader onDataParsed={onDataParsed} onError={onError} />
          </ErrorBoundary>
        </div>

        <HowItWorks />
      </div>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  { num: '01', title: 'Upload your CSV', body: 'Drag and drop any logistics CSV. We support up to 10 MB with automatic column detection.' },
  { num: '02', title: 'Ask a question', body: 'Type any question about delays, carriers, routes, or costs in plain English.' },
  { num: '03', title: 'Get instant insights', body: 'AI pre-filters your data and returns an answer, filtered table, and chart.' },
] as const;

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
      >
        <span className="text-sm font-medium text-gray-700">How it works</span>
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-5 py-4">
            <ol className="grid gap-4 sm:grid-cols-3" role="list">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <li key={step.num} className="flex flex-col gap-1.5">
                  <span className="font-mono text-xs font-bold text-indigo-400">{step.num}</span>
                  <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                  <p className="text-xs leading-relaxed text-gray-500">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Data screen (after upload) ───────────────────────────────────────────────

function DataScreen({
  csvData,
  onSubmit,
  queryLoading,
  queryResult,
  queryError,
}: {
  csvData: ParsedCSVData;
  onSubmit: (q: string) => void;
  queryLoading: boolean;
  queryResult: AnalysisResponse | null;
  queryError: string | null;
}) {
  const hasResult = queryResult !== null || queryLoading || queryError !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">

      {/* ── Step 2 hero: question input ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Ask a question</p>
        </div>

        {/* Glowing card to draw the eye */}
        <div className="relative rounded-2xl bg-white shadow-md ring-2 ring-indigo-100 focus-within:ring-indigo-400 transition-all duration-200">
          <div className="px-5 pt-5">
            <p className="mb-3 text-base font-semibold text-gray-900">
              Ask anything about your shipments
            </p>
            <ErrorBoundary>
              <QueryInterface onSubmit={onSubmit} disabled={false} loading={queryLoading} />
            </ErrorBoundary>
          </div>
          {/* Animated bottom glow accent */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 opacity-60" />
        </div>
      </div>

      {/* ── Results section (appears after query) ──────────────────────────── */}
      {hasResult && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Results</p>
          </div>
          <ErrorBoundary>
            <ChartDisplay
              response={queryResult}
              loading={queryLoading}
              error={queryError}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* ── Step 1 badge: dataset preview (secondary) ───────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-white">1</span>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Dataset preview</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {csvData.rows.length} rows · {csvData.headers.length} columns
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4">
            <ErrorBoundary>
              <DataTable data={csvData} loading={false} />
            </ErrorBoundary>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function ArrowLeftUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 4.5A9.75 9.75 0 1120.25 15" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
