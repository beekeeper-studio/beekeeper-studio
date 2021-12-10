
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

export interface ExportProgress {
  totalRecords: number;
  countExported: number;
  secondsElapsed: number;
  secondsRemaining: number;
  status: ExportStatus;
  percentComplete: number;
}
export type ProgressCallback = (p: ExportProgress) => void;
