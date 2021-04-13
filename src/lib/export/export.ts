import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import remote from 'electron'
import { DBConnection, TableOrView, TableFilter, TableResult, BeeCursor } from '@/lib/db/client'
import { promises } from 'fs'
import NativeWrapper from '../NativeWrapper'

export interface ExportOptions {
  chunkSize: number,
  deleteOnAbort: boolean
}

export abstract class Export {
  id: string
  connection: DBConnection
  countExported: number = 0
  countTotal: number = 0
  error: Error | null = null
  filePath: string
  fileSize: number = 0
  filters: TableFilter[] | string
  lastChunkTime: number = 0
  options: ExportOptions
  outputOptions: any
  showNotification: boolean = true
  status: Export.Status = Export.Status.Idle
  table: TableOrView
  timeElapsed: number = 0
  timeLeft: number = 0
  cursor?: BeeCursor
  fileHandle?: promises.FileHandle

  abstract separator: string
  abstract getHeader(fields: string[]): Promise<string>
  abstract getFooter(): string
  abstract formatRow(data: any): string

  constructor(
    filePath: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    options: ExportOptions,
    outputOptions: any
  ) {
    this.filePath = filePath
    this.connection = connection
    this.table = table
    this.filters = filters
    this.options = options
    this.outputOptions = outputOptions
    this.id = this.generateId()
  }

  generateId(): string {
    const md5sum = crypto.createHash('md5')

    md5sum.update(Date.now().toString(), 'utf8')
    md5sum.update(this.table.name)
    md5sum.update(this.filePath)

    return md5sum.digest('hex')
  }

  async initExport(): Promise<void> {
    this.status = Export.Status.Exporting
    this.countExported = 0
    

    this.fileHandle = await fs.promises.open(this.filePath, 'w+')
    const results = await this.connection.selectTopStream(
      this.table.name,
      [],
      this.filters,
      this.table.schema,
    )
    this.cursor = results.cursor
    this.countTotal = results.totalRows
    const header = await this.getHeader(results.fields)

    if (header) {
      await this.fileHandle.write(header)
    }
  }

  async exportData(): Promise<void> {
      // keep going until we don't get any more results.
      let rows
      do {

        if (!this.cursor) {
          throw new Error("Something went wrong")
        }
        rows = await this.cursor?.read(this.options.chunkSize)
        for (let rI = 0; rI < rows.length; rI++) {
          const row = rows[rI];
          const formatted = this.formatRow(row)
          this.fileHandle?.write(formatted)
          this.fileHandle?.write(this.separator)
        }
        this.countExported += rows.length

        this.calculateTimeLeft()
      } while (
        rows.length > 0 &&
        this.status === Export.Status.Exporting
      )
      await this.cursor?.close()
  }

  async finalizeExport(): Promise<void> {
    const footer = await this.getFooter()
    await this.fileHandle?.write(footer)
    await this.fileHandle?.close()
    this.fileHandle = undefined

    this.status = Export.Status.Completed
  }

  async exportToFile(): Promise<void> {
    try {
      await this.initExport()
      await this.exportData()
      await this.finalizeExport()

      if (this.status === Export.Status.Aborted) {
        if (this.options.deleteOnAbort) {
          await promises.unlink(this.filePath)
        }
      }


    } catch (error) {
      this.status = Export.Status.Error
      this.error = error

      await this.fileHandle?.close()


      if (this.options.deleteOnAbort) {
        await promises.unlink(this.filePath)
      }
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

  abort(): void {
    this.status = Export.Status.Aborted
  }

  pause(): void {
    this.status = Export.Status.Paused
  }

  hide(): void {
    this.showNotification = false
  }

  openFile(): void {
    NativeWrapper.files.open(this.filePath)
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

export namespace Export {
  export enum Status {
    Idle,
    Exporting,
    Paused,
    Aborted,
    Completed,
    Error
  }
}
