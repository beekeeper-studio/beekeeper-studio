
export enum ExportStatus {
  Idle,
  Exporting,
  Paused,
  Aborted,
  Completed,
  Error
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
