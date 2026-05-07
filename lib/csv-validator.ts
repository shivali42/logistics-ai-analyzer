export interface ValidationResult {
  valid: boolean;
  error?: string;
  missingColumns?: string[];
  extraColumns?: string[];
  warnings?: string[];
}

export const REQUIRED_COLUMNS = [
  'shipment_id',
  'route',
  'origin',
  'destination',
  'carrier',
  'scheduled_date',
  'actual_delivery_date',
  'delay_hours',
  'status',
  'cost',
] as const;

export function validateCSVColumns(headers: string[]): ValidationResult {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const required = REQUIRED_COLUMNS as readonly string[];

  const missing = required.filter((col) => !normalized.includes(col));
  const extra = normalized.filter((col) => !required.includes(col));

  if (missing.length > 0) {
    return {
      valid: false,
      error: `CSV format mismatch. Required columns: [${required.join(', ')}]. Missing: [${missing.join(', ')}]`,
      missingColumns: missing,
      extraColumns: extra.length > 0 ? extra : undefined,
    };
  }

  if (extra.length > 0) {
    return {
      valid: true,
      warnings: [`Your CSV has extra columns that won't be used: ${extra.join(', ')}`],
      extraColumns: extra,
    };
  }

  return { valid: true };
}
