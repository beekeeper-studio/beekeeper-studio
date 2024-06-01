import { TableFilter, TableOrView } from "../db/models";

export enum ExportStatus {
  Idle = 'idle',
  Exporting = 'exporting',
  Paused = 'paused',
  Aborted = 'aborted',
  Completed = 'completed',
  Error = 'error'
}

export interface ExportOptions {
  chunkSize: number;
  deleteOnAbort: boolean;
}

export interface StartExportOptions {
  table: TableOrView,
  query?: string,
  queryName?: string,
  filters: TableFilter[],
  exporter: 'csv' | 'json' | 'sql' | 'jsonl'
  filePath: string
  options: {
    chunkSize: number
    deleteOnAbort: boolean
    includeFilter: boolean
  }
  outputOptions: any
}

export interface ExportProgress {
  totalRecords: number;
  countExported: number;
  secondsElapsed: number;
  secondsRemaining: number;
  status: ExportStatus;
  percentComplete: number;
}
export type ProgressCallback = (p: ExportProgress) => void;
