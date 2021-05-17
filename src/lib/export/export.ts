import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { promises } from 'fs'
import { ElectronPlugin } from '../NativeWrapper'
import rawlog from 'electron-log'
import { BeeCursor, TableColumn, TableFilter, TableOrView } from '../db/models'
import { DBConnection } from '../db/client'
import { ExportOptions, ExportStatus, ProgressCallback, ExportProgress } from './models'
import _ from 'lodash'
import { Mutators } from '../data/tools'

const log = rawlog.scope('export/export')

export abstract class Export {
  // don't make stuff public you don't want observed in vue
  id: string

  countExported: number = 0
  countTotal: number = 0
  error: Error | null = null
  fileSize: number = 0
  lastChunkTime: number = 0
  // see set status()
  private _status: ExportStatus = ExportStatus.Idle
  timeElapsed: number = 0
  timeLeft: number = 0
  private cursor?: BeeCursor
  private columns?: TableColumn[]
  private fileHandle?: promises.FileHandle
  private callbacks = {
    progress: Array<ProgressCallback>()
  }

  constructor(
    public filePath: string,
    public connection: DBConnection,
    public table: TableOrView,
    public filters: TableFilter[] | any[],
    public options: ExportOptions,
  ) {
    this.id = this.generateId()
  }

  abstract rowSeparator: string
  // do not add newlines / row separators
  abstract getHeader(columns: TableColumn[]): Promise<string>
  abstract getFooter(): string
  // do not add newlines / row separators
  abstract formatRow(data: any[]): string

  protected rowToObject(row: any[]): Object {
    let columns = this.dedupedColumns
    if (!columns) columns = row.map((_r, i) => {
      return {dataType: 'unknown', columnName: `col_${i+1}`}
    })
    const names = columns.map(c => c.columnName)
    return _.zipObject(names, row)
  }

  get dedupedColumns(): TableColumn[] {
    if (!this.columns) return []
    const found: Map<string, number> = new Map()
    return this.columns.map((c) => {
      const nuCol: TableColumn = { ...c }
      found.set(c.columnName, (found.get(c.columnName) || 0) + 1)
      const counter = found.get(c.columnName) || 0
      if (counter > 1) {
        nuCol.columnName = `${c.columnName}_${counter}`
      }
      return nuCol
    })
  }


  set status(status: ExportStatus) {
    this._status = status
    this.notify()
  }

  get status() {
    return this._status
  }

  public get percentComplete(): number {
    if([ExportStatus.Completed, ExportStatus.Aborted, ExportStatus.Error].includes(this.status)) {
      return 100
    }
    return Math.round((this.countExported / this.countTotal) * 100)
  }

  notify() {
    const payload = {
      totalRecords: this.countTotal,
      countExported: this.countExported,
      secondsElapsed: this.timeElapsed,
      secondsRemaining: this.timeLeft,
      status: this.status,
      percentComplete: this.percentComplete,
    }
    this.callbacks.progress.forEach(c => c(payload))
  }


  generateId(): string {
    const md5sum = crypto.createHash('md5')

    md5sum.update(Date.now().toString(), 'utf8')
    md5sum.update(this.table.name)
    md5sum.update(this.filePath)

    return md5sum.digest('hex')
  }

  async initExport(): Promise<void> {
    this.status = ExportStatus.Exporting
    this.countExported = 0
    

    this.fileHandle = await fs.promises.open(this.filePath, 'w+')
    const results = await this.connection.selectTopStream(
      this.table.name,
      [],
      this.filters,
      this.options.chunkSize,
      this.table.schema,
    )
    this.columns = results.columns
    this.cursor = results.cursor

    log.debug('initializing export', results)
    this.countTotal = results.totalRows
    await this.cursor?.start()
    const header = await this.getHeader(results.columns)

    if (header) {
      await this.fileHandle.write(header)
      await this.fileHandle.write(this.rowSeparator)
    }
  }

  async exportData(): Promise<void> {
      // keep going until we don't get any more results.
      let rows: any[][]
      do {
        log.info('exportData')
        if (!this.cursor) {
          throw new Error("Something went wrong")
        }
        rows = await this.cursor?.read()
        // log.info(`read ${rows.length} rows`)
        for (let rI = 0; rI < rows.length; rI++) {
          const row = rows[rI];
          const mutated = Mutators.mutateRow(row, this.columns?.map((c) => c.dataType), true)
          const formatted = this.formatRow(mutated)
          this.fileHandle?.write(formatted)
          this.fileHandle?.write(this.rowSeparator)
        }
        this.countExported += rows.length

        this.calculateTimeLeft()
        this.notify()

      } while (
        rows.length > 0 &&
        this.status === ExportStatus.Exporting
      )
      await this.cursor?.close()
  }

  async finalizeExport(): Promise<void> {
    const footer = await this.getFooter()
    await this.fileHandle?.write(footer)
    await this.fileHandle?.close()
    this.fileHandle = undefined
    this.status = ExportStatus.Completed
  }

  async exportToFile(): Promise<void> {
    try {
      await this.initExport()
      await this.exportData()
      await this.finalizeExport()

      if (this.status === ExportStatus.Aborted) {
        if (this.options.deleteOnAbort) {
          await promises.unlink(this.filePath)
        }
      }


    } catch (error) {
      this.status = ExportStatus.Error
      this.error = error
      log.error(error)
      await this.fileHandle?.close()


      if (this.options.deleteOnAbort) {
        await promises.unlink(this.filePath)
      }
      throw error
    }
  }

  calculateTimeLeft(): void {
    if (this.lastChunkTime) {
      this.timeElapsed += (Date.now() - this.lastChunkTime)
      const recordsLeft = this.countTotal - this.countExported
      const timePerRecord = this.timeElapsed / this.countExported
      this.timeLeft = Math.round(timePerRecord * recordsLeft)
    }

    this.lastChunkTime = Date.now()
  }

  onProgress(func: (progress: ExportProgress) => void): void {
    this.callbacks.progress.push(func)
  }

  offProgress(func: (progress: ExportProgress) => void): void {
    this.callbacks.progress = this.callbacks.progress.filter(f => f !== func)
  }

  abort(): void {
    this.status = ExportStatus.Aborted
  }

  pause(): void {
    this.status = ExportStatus.Paused
  }


  openFile(): void {
    ElectronPlugin.files.open(this.filePath)
  }

  getFileName(): string {
    return path.basename(this.filePath)
  }

  getFilterString(): string {
    if (typeof this.filters === 'object') {
      return JSON.stringify(this.filters)
    }

    return this.filters
  }
}
