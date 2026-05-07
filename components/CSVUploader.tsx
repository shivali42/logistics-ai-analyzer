'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { parseCSV } from '@/lib/csv-parser';
import { validateCSVColumns } from '@/lib/csv-validator';
import type { ParsedCSVData } from '@/types';

type DropState = 'idle' | 'hover' | 'active' | 'error';
type ValidationState = 'none' | 'success' | 'error' | 'warning';

interface CSVUploaderProps {
  onDataParsed: (data: ParsedCSVData) => void;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PREVIEW_ROWS = 5;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DROP_ZONE_STYLES: Record<DropState, string> = {
  idle: 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40',
  hover: 'border-indigo-400 bg-indigo-50 scale-[1.01]',
  active: 'border-indigo-300 bg-white',
  error: 'border-red-300 bg-red-50',
};

const CSVUploader = memo(function CSVUploader({ onDataParsed, onError }: CSVUploaderProps) {
  const [dropState, setDropState] = useState<DropState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [validationState, setValidationState] = useState<ValidationState>('none');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback(
    (message: string) => {
      setDropState('error');
      setErrorMessage(message);
      onError(message);
    },
    [onError]
  );

  const processFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setValidationState('none');
      setValidationMessage(null);
      setMissingColumns([]);
      setExtraColumns([]);

      if (!file.name.toLowerCase().endsWith('.csv')) {
        handleError('Only .csv files are accepted.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        handleError(`File is too large (${formatBytes(file.size)}). Maximum size is 10 MB.`);
        return;
      }
      if (file.size === 0) {
        handleError('The selected file is empty. Please choose a CSV with data.');
        return;
      }

      setDropState('active');
      setFileName(file.name);
      setFileSize(file.size);

      let data: ParsedCSVData;
      try {
        data = await parseCSV(file);
      } catch (err) {
        handleError(
          err instanceof Error
            ? err.message
            : 'Could not read the file. Make sure it is a valid CSV.'
        );
        setFileName(null);
        setFileSize(null);
        return;
      }

      // Validate columns before accepting the file
      const result = validateCSVColumns(data.headers);

      if (!result.valid) {
        setDropState('error');
        setValidationState('error');
        setMissingColumns(result.missingColumns ?? []);
        setExtraColumns(result.extraColumns ?? []);
        setValidationMessage(result.error ?? 'CSV format does not match the required format.');
        setFileName(null);
        setFileSize(null);
        return;
      }

      setParsedData(data);
      setDropState('idle');

      if (result.warnings && result.warnings.length > 0) {
        setValidationState('warning');
        setExtraColumns(result.extraColumns ?? []);
        setValidationMessage(result.warnings[0]);
      } else {
        setValidationState('success');
        setValidationMessage('CSV format validated successfully.');
      }

      onDataParsed(data);
    },
    [handleError, onDataParsed]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropState((prev) => (prev === 'error' ? prev : 'hover'));
  }, []);

  const onDragLeave = useCallback(() => {
    setDropState((prev) => (prev === 'hover' ? 'idle' : prev));
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile]
  );

  const clear = useCallback(() => {
    setParsedData(null);
    setFileName(null);
    setFileSize(null);
    setErrorMessage(null);
    setDropState('idle');
    setValidationState('none');
    setValidationMessage(null);
    setMissingColumns([]);
    setExtraColumns([]);
  }, []);

  const handleDownloadSample = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/sample-logistics.csv';
    link.download = 'sample-logistics.csv';
    link.click();
  }, []);

  const preview = parsedData?.rows.slice(0, PREVIEW_ROWS) ?? [];

  return (
    <div className="w-full space-y-4">
      {/* Sample download bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Make sure your CSV matches the sample format before uploading.
        </p>
        <button
          onClick={handleDownloadSample}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Download Sample CSV
        </button>
      </div>

      {/* Drop zone — hidden once a file is loaded */}
      {!parsedData && (
        <div
          role="button"
          aria-label="Upload CSV file by clicking or dragging and dropping"
          tabIndex={0}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          className={[
            'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            DROP_ZONE_STYLES[dropState],
          ].join(' ')}
        >
          <UploadIcon
            className={[
              'h-10 w-10 transition-colors',
              dropState === 'error' ? 'text-red-400' : 'text-indigo-400',
            ].join(' ')}
          />

          <div>
            <p className="text-sm font-semibold text-slate-800">
              {dropState === 'hover' ? 'Release to upload' : 'Drop your CSV here'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              or{' '}
              <span className="text-indigo-600 underline underline-offset-2">browse files</span>
              {' '}— .csv only, max 10 MB
            </p>
          </div>

          {dropState === 'active' && (
            <p className="text-xs text-indigo-500 animate-pulse">Parsing…</p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            aria-hidden="true"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* File parse error banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <ErrorIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={clear}
            aria-label="Dismiss error"
            className="ml-auto shrink-0 text-red-400 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Validation feedback */}
      {validationState === 'error' && validationMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2"
        >
          <div className="flex items-start gap-3">
            <ErrorIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700">Format validation failed</p>
              {missingColumns.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Missing columns:{' '}
                  <span className="font-mono font-semibold">{missingColumns.join(', ')}</span>
                </p>
              )}
              {extraColumns.length > 0 && (
                <p className="mt-0.5 text-xs text-red-500">
                  Unexpected columns:{' '}
                  <span className="font-mono">{extraColumns.join(', ')}</span>
                </p>
              )}
              <p className="mt-1.5 text-xs text-red-500">
                Download the sample CSV to see the exact format required.
              </p>
            </div>
            <button
              onClick={clear}
              aria-label="Dismiss"
              className="ml-auto shrink-0 text-red-400 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {validationState === 'success' && validationMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
        >
          <CheckIcon className="h-4 w-4 shrink-0 text-green-500" />
          <p className="text-sm text-green-700">{validationMessage}</p>
        </div>
      )}

      {validationState === 'warning' && validationMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <WarnIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm text-amber-700">File loaded with warnings</p>
            {extraColumns.length > 0 && (
              <p className="mt-0.5 text-xs text-amber-600">
                Extra columns ignored:{' '}
                <span className="font-mono">{extraColumns.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* File meta + clear */}
      {parsedData && fileName && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-8 w-8 shrink-0 text-indigo-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{fileName}</p>
              <p className="text-xs text-slate-500">
                {fileSize !== null && formatBytes(fileSize)}
                {' · '}
                {parsedData.rows.length.toLocaleString()} rows
                {' · '}
                {parsedData.headers.length} columns
              </p>
            </div>
          </div>
          <button
            onClick={clear}
            aria-label="Remove file and reset uploader"
            className="ml-4 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Clear
          </button>
        </div>
      )}

      {/* 5-row preview */}
      {parsedData && preview.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Preview — first {preview.length} of {parsedData.rows.length} rows
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  {parsedData.headers.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    {parsedData.headers.map((h) => (
                      <td
                        key={h}
                        className="max-w-[200px] truncate whitespace-nowrap px-4 py-2 text-xs text-slate-700"
                        title={row[h] ?? ''}
                      >
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

export default CSVUploader;

// ─── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
