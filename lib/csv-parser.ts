import Papa from 'papaparse';
import type { ParsedCSVData } from '@/types';

/**
 * Parses a CSV File into a typed ParsedCSVData structure using PapaParse.
 *
 * Only Delimiter and Quotes errors are treated as fatal — row-level field
 * mismatches are tolerated so partially malformed files still load. Headers
 * are trimmed to guard against invisible whitespace in exported spreadsheets.
 */
export function parseCSV(file: File): Promise<ParsedCSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          const critical = results.errors.find((e) => e.type === 'Delimiter' || e.type === 'Quotes');
          if (critical) {
            reject(new Error(`Malformed CSV: ${critical.message}`));
            return;
          }
        }

        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error('CSV has no headers or is empty.'));
          return;
        }

        resolve({
          headers,
          rows: results.data,
        });
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}
