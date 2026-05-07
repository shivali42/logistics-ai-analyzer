'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { QueryHistory } from '@/types';

const MAX_CHARS = 500;
const MAX_HISTORY = 5;

const EXAMPLE_QUERIES = [
  'Which routes had the most delays?',
  'Show average delivery time by carrier',
  "What's the trend over time?",
  'Which destinations perform best?',
] as const;

interface QueryInterfaceProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

const EMPTY_RESPONSE: QueryHistory['response'] = {
  answer: '',
  chartType: 'none',
  chartData: [],
  chartConfig: { xKey: '', yKey: '', title: '' },
};

const QueryInterface = memo(function QueryInterface({
  onSubmit,
  disabled = false,
  loading = false,
}: QueryInterfaceProps) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ⌘K / Ctrl+K global focus shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;

    setHistory((prev) => {
      const entry: QueryHistory = {
        id: crypto.randomUUID(),
        question: trimmed,
        timestamp: new Date(),
        response: EMPTY_RESPONSE,
      };
      return [entry, ...prev].slice(0, MAX_HISTORY);
    });

    onSubmit(trimmed);
    setValue('');
  }, [value, disabled, loading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Single handler for both chips and history items
  const fillInput = useCallback(
    (q: string) => {
      if (disabled || loading) return;
      setValue(q);
      textareaRef.current?.focus();
    },
    [disabled, loading]
  );

  const clearHistory = useCallback(() => setHistory([]), []);

  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const canSubmit = value.trim().length > 0 && !disabled && !loading && !isOverLimit;

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div
        className={[
          'rounded-2xl border bg-white shadow-sm transition-all duration-200',
          isFocused && !disabled
            ? 'border-indigo-400 shadow-md shadow-indigo-100 ring-1 ring-indigo-200'
            : 'border-slate-200',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        <div className="relative px-4 pt-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS + 20))}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={
              disabled
                ? 'Upload a CSV file to start asking questions…'
                : 'Ask a question about your data… (Enter to submit)'
            }
            rows={3}
            aria-label="Ask a question about your data"
            aria-describedby="query-hint query-char-count"
            className="w-full resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
          <span
            id="query-char-count"
            aria-live="polite"
            aria-atomic="true"
            className={`text-xs tabular-nums transition-colors ${
              isOverLimit
                ? 'font-semibold text-red-500'
                : remaining <= 50
                ? 'text-amber-500'
                : 'text-slate-400'
            }`}
          >
            {isOverLimit
              ? `${Math.abs(remaining)} characters over limit`
              : `${remaining} remaining`}
          </span>

          <div className="flex items-center gap-2">
            <span id="query-hint" className="hidden text-xs text-slate-400 sm:block">
              <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>{' '}
              to focus
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label={loading ? 'Analyzing…' : 'Submit question'}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <SparkleIcon className="h-3.5 w-3.5" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Example queries">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => fillInput(q)}
            disabled={disabled || loading}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Query history */}
      {history.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <HistoryIcon className="h-3.5 w-3.5" />
              Recent
            </div>
            <button
              onClick={clearHistory}
              aria-label="Clear query history"
              className="rounded text-xs text-slate-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Clear
            </button>
          </div>
          <ul role="list" className="divide-y divide-slate-50">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => fillInput(item.question)}
                  disabled={disabled || loading}
                  className="group flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 disabled:cursor-not-allowed"
                >
                  <ReplayIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-400" />
                  <span className="flex-1 truncate text-sm text-slate-700">{item.question}</span>
                  <time
                    dateTime={item.timestamp.toISOString()}
                    className="shrink-0 text-xs text-slate-400"
                  >
                    {formatTimestamp(item.timestamp)}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default QueryInterface;

// ─── Icons ────────────────────────────────────────────────────────────────────

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
    </svg>
  );
}

function ReplayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
