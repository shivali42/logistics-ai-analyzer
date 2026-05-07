'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import type { ParsedCSVData } from '@/types';
import EmptyState from './EmptyState';

const PAGE_SIZE = 10;

type SortDir = 'asc' | 'desc';

interface SortState {
  column: string;
  dir: SortDir;
}

interface DataTableProps {
  data: ParsedCSVData;
  loading?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading data" role="status">
      <div className="h-9 rounded-xl bg-slate-100 w-64" />
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="h-10 bg-slate-100" />
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className={`h-12 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`ml-1.5 inline h-3.5 w-3.5 shrink-0 transition-colors ${
        active ? 'text-indigo-600' : 'text-slate-300'
      }`}
      fill="currentColor"
      aria-hidden="true"
    >
      {active && dir === 'asc' ? (
        <path d="M8 3L13 10H3L8 3Z" />
      ) : active && dir === 'desc' ? (
        <path d="M8 13L3 6H13L8 13Z" />
      ) : (
        <>
          <path d="M8 2L11.5 7H4.5L8 2Z" opacity="0.4" />
          <path d="M8 14L4.5 9H11.5L8 14Z" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

const MobileCard = memo(function MobileCard({
  row,
  headers,
}: {
  row: Record<string, string>;
  headers: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-2">
      {headers.map((h) => (
        <div key={h} className="flex justify-between gap-3 text-sm">
          <span className="shrink-0 font-medium text-slate-500">{h}</span>
          <span className="truncate text-right text-slate-800" title={row[h] ?? ''}>
            {row[h] ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

const DataTable = memo(function DataTable({ data, loading = false }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);

  const { headers, rows } = data;

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      headers.some((h) => (row[h] ?? '').toLowerCase().includes(q))
    );
  }, [rows, headers, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.column] ?? '';
      const bv = b[sort.column] ?? '';
      const numA = Number(av);
      const numB = Number(bv);
      const cmp =
        !isNaN(numA) && !isNaN(numB) && av !== '' && bv !== ''
          ? numA - numB
          : av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const { totalPages, currentPage, pageRows } = useMemo(() => {
    const total = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const current = Math.min(page, total);
    return {
      totalPages: total,
      currentPage: current,
      pageRows: sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    };
  }, [sorted, page]);

  const handleSort = useCallback((col: string) => {
    setSort((prev) =>
      prev?.column === col
        ? { column: col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { column: col, dir: 'asc' }
    );
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const clearSearch = useCallback(() => handleSearch(''), [handleSearch]);

  const pageRangeItems = useMemo(
    () => buildPageRange(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (loading) return <TableSkeleton />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<TableIcon />}
        title="No data to display"
        description="Upload a CSV file to see your data here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search all columns…"
            aria-label="Search table rows"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <p className="shrink-0 text-xs text-slate-500" aria-live="polite" aria-atomic="true">
          {sorted.length.toLocaleString()} of {rows.length.toLocaleString()} rows
          {search && ' (filtered)'}
        </p>
      </div>

      {/* Empty search result */}
      {sorted.length === 0 && (
        <EmptyState
          icon={<SearchEmptyIcon />}
          title="No matching rows"
          description={`No rows contain "${search}". Try a different search term.`}
          variant="search"
          action={{ label: 'Clear search', onClick: clearSearch }}
        />
      )}

      {sorted.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="CSV data table" aria-rowcount={sorted.length}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {headers.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        aria-sort={
                          sort?.column === h
                            ? sort.dir === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-slate-500 first:pl-5 last:pr-5"
                      >
                        <button
                          onClick={() => handleSort(h)}
                          className="group inline-flex items-center rounded transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1"
                          aria-label={`Sort by ${h}${sort?.column === h ? `, currently ${sort.dir}ending` : ''}`}
                        >
                          <span className="uppercase tracking-wide">{h}</span>
                          <SortIcon
                            active={sort?.column === h}
                            dir={sort?.column === h ? sort.dir : 'asc'}
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr
                      key={i}
                      className="group border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors"
                    >
                      {headers.map((h) => (
                        <td
                          key={h}
                          className="max-w-[220px] truncate whitespace-nowrap px-4 py-2.5 text-slate-700 first:pl-5 last:pr-5"
                          title={row[h] ?? ''}
                        >
                          {row[h] ?? <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {pageRows.map((row, i) => (
              <MobileCard key={i} row={row} headers={headers} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Table pagination" className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <PaginationButton
                  onClick={() => setPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  «
                </PaginationButton>
                <PaginationButton
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </PaginationButton>

                {pageRangeItems.map((item, i) =>
                  item === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-400" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <PaginationButton
                      key={item}
                      onClick={() => setPage(item as number)}
                      active={item === currentPage}
                      aria-label={`Page ${item}`}
                      aria-current={item === currentPage ? 'page' : undefined}
                    >
                      {item}
                    </PaginationButton>
                  )
                )}

                <PaginationButton
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  ›
                </PaginationButton>
                <PaginationButton
                  onClick={() => setPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  »
                </PaginationButton>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
});

export default DataTable;

// ─── Pagination helpers ────────────────────────────────────────────────────────

interface PaginationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
}

function PaginationButton({ onClick, disabled, active, children, ...aria }: PaginationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...aria}
      className={[
        'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1',
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push('…');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-7.5m0 0A1.125 1.125 0 013.375 9.75h.375m0 0v7.5m0-7.5h1.5m-1.5 0v7.5m0 0h1.5m0-7.5V9.75m0 7.5h1.5M9.75 9.75h4.5m-4.5 7.5h4.5m0-7.5v7.5m0-7.5h.375a1.125 1.125 0 011.125 1.125v6.375m-7.5 0V9.75" />
    </svg>
  );
}

function SearchEmptyIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0zM10.5 7.5v6m3-3h-6" />
    </svg>
  );
}
