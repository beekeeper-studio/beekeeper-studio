import { expose } from "threads/worker"

interface ExportOptions {
  foo: string,
  joe: string,
  bloggs: boolean
}

const ExportWorker = {
  export: (config: ExportOptions): boolean => {
    console.log('exporting! Using ', config);
    return true
  }
}

export type ExportWorker = typeof ExportWorker

expose(ExportWorker)