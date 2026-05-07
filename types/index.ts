export type CSVRow = Record<string, string>;

export interface ShipmentData {
  shipment_id: string;
  route: string;
  origin: string;
  destination: string;
  carrier: string;
  scheduled_date: string;
  actual_delivery_date: string;
  delay_hours: number;
  status: 'delivered' | 'in-transit' | 'delayed' | 'cancelled';
  cost?: number;
}

export interface ParsedCSVData {
  headers: string[];
  rows: CSVRow[];
}

export interface AnalysisResponse {
  answer: string;
  chartType: 'bar' | 'line' | 'pie' | 'table' | 'none';
  chartData: Record<string, unknown>[];
  chartConfig: {
    xKey: string;
    yKey: string;
    title: string;
    xLabel?: string;
    yLabel?: string;
  };
  /** Filtered rows used for this analysis — attached server-side, not from AI */
  sourceData?: Record<string, unknown>[];
  matchedRows?: number;
  totalRows?: number;
}

export interface QueryHistory {
  id: string;
  question: string;
  timestamp: Date;
  response: AnalysisResponse;
}
