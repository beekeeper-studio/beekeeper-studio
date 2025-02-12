import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { promises } from 'fs'
import { dialectFor } from '@shared/lib/dialects/models'
import rawlog from '@bksLogger'
import { BeeCursor, TableColumn, TableFilter, TableOrView } from '../db/models'
import { ExportOptions, ExportStatus, ProgressCallback, ExportProgress } from './models'
import _ from 'lodash'
import { Mutators } from '../data/tools'
import { BasicDatabaseClient } from '../db/clients/BasicDatabaseClient'

const log = rawlog.scope('export/export')

export abstract class Export {
  // don't make stuff public you don't want observed in vue
  id: string

  countExported = 0
  countTotal = 0
  error: Error | null = null
  fileSize = 0
  lastChunkTime = 0

  preserveComplex = true
  // see set status()
  private _status: ExportStatus = ExportStatus.Idle
  timeElapsed = 0
  timeLeft = 0
  private cursor?: BeeCursor
  private columns?: TableColumn[]
  private fileHandle?: promises.FileHandle
  private callbacks = {
    progress: Array<ProgressCallback>()
  }

  constructor(
    public filePath: string,
    public connection: BasicDatabaseClient<any>,
    public table: TableOrView,
    public query: string,
    public queryName: string,
    public filters: TableFilter[] | any[],
    public options: ExportOptions,
    public managerNotify = true
  ) {
    this.id = this.generateId()
  }

  abstract rowSeparator: string

  needsFinalSeparator = true
  // do not add newlines / row separators
  abstract getHeader(columns: TableColumn[]): Promise<string>
  abstract getFooter(): string
  // do not add newlines / row separators
  abstract formatRow(data: any[], columns?: TableColumn[]): string

  protected rowToObject(row: any[]): Record<string, any> {
    const columns = this.dedupedColumns?.length ?  this.dedupedColumns : row.map((_r, i) => {
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
    // i thought you weren't supposed to mess with vue's private _properties
    this._status = status
    this.notify()
  }

  get status() {
    // more accessing vue's private _properties
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
    // console.log('notify() calling callbacks', payload, 'callbacks: ', this.callbacks.progress)
    this.callbacks.progress.forEach(c => c(payload))
  }


  generateId(): string {
    const md5sum = crypto.createHash('md5')

    md5sum.update(Date.now().toString(), 'utf8')
    md5sum.update(this.table ? this.table.name : this.queryName)
    md5sum.update(this.filePath)

    return md5sum.digest('hex')
  }

  async initExport(): Promise<void> {
    this.status = ExportStatus.Exporting
    this.countExported = 0


    this.fileHandle = await fs.promises.open(this.filePath, 'w+')

    let results;
    if (this.table) {
      results = await this.connection.selectTopStream(
        this.table.name,
        [],
        this.filters,
        this.options.chunkSize,
        this.table.schema,
      )
    }
    else {
      results = await this.connection.queryStream(
        this.query,
        this.options.chunkSize,
      )
    }

    this.columns = results.columns
    this.cursor = results.cursor

    this.countTotal = results.totalRows
    await this.cursor?.start()
    const header = await this.getHeader(results.columns)

    if (header) {
      await this.fileHandle.write(header)
    }
  }

  async exportData(): Promise<void> {
      // keep going until we don't get any more results.
      log.debug("running export")
      let rows: any[][]
      let needsSeparator = false
      do {
        if (!this.cursor) {
          throw new Error("Something went wrong")
        }
        rows = await this.cursor?.read()
        for (let rI = 0; rI < rows.length; rI++) {
          const row = rows[rI];
          const mutated = Mutators.mutateRow(row, this.columns?.map((c) => c.dataType), this.preserveComplex, dialectFor(this.connection.connectionType))
          const formatted = this.formatRow(mutated, this.columns)

          // needsSeparator allows us to skip adding the rowSeparator
          // on the FINAL row of the file
          if (needsSeparator === true) {
            await this.fileHandle?.write(this.rowSeparator)
          }
          await this.fileHandle?.write(formatted)
          if (rI === rows.length - 1 && !this.needsFinalSeparator) {
            // do nothing
            needsSeparator = true
          } else {
            await this.fileHandle?.write(this.rowSeparator)
            needsSeparator = false
          }
        }
        this.countExported += rows.length

        // console.log('calculating time left')
        this.calculateTimeLeft()
        this.notify()

      } while (
        rows.length > 0 &&
        this.status === ExportStatus.Exporting
      )
      await this.cursor?.close()
  }

  async finalizeExport(): Promise<void> {
    // we don't do final stuff if we aborted.
    if (this.status === ExportStatus.Aborted) {
      return;
    }
    const footer = await this.getFooter()
    await this.fileHandle?.write(footer)
    this.status = ExportStatus.Completed
  }

  async exportToFile(): Promise<void> {
    try {
      log.debug("starting export")
      await this.initExport()
      await this.exportData()
      await this.finalizeExport()

      await this.fileHandle?.close()
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
    } finally {
      this.fileHandle = undefined
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
    // console.log('adding progress callback')
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
