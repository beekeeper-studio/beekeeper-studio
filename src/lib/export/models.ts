
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
  exporterId: string
  totalRecords: number
  countExported: number
  secondsElapsed: number
  secondsRemaining: number
  status: ExportStatus
  percentComplete: number,
  tableName: string
}
export type ProgressCallback = (p: ExportProgress) => void
