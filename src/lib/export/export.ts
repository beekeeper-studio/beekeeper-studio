import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import remote from 'electron'
import { DBConnection, TableOrView, TableFilter, TableResult } from '@/lib/db/client'

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
  filters: TableFilter[] | any[]
  lastChunkTime: number = 0
  options: ExportOptions
  outputOptions: any
  showNotification: boolean = true
  status: Export.Status = Export.Status.Idle
  table: TableOrView
  timeElapsed: number = 0
  timeLeft: number = 0

  abstract getHeader(firstRow: any): Promise<string | void>
  abstract getFooter(): Promise<string | void>
  abstract formatChunk(data: any): string[]

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

  async getChunk(offset: number, limit: number): Promise<TableResult | undefined> {
    const result = await this.connection.selectTop(
      this.table.name,
      offset,
      limit,
      [],
      this.filters,
      this.table.schema
    );

    return result
  }

  async getFirstRow() {
    const row = await this.getChunk(0, 1)

    if (row && row.result && row.result.length === 1) {
      return row.result[0]
    }
  }

  async writeToFile(content: string) {
    return await fs.promises.appendFile(this.filePath, content + "\n")
  }

  async deleteFile() {
    return await fs.promises.unlink(this.filePath)
  }

  async initExport(): Promise<void> {
    this.status = Export.Status.Exporting
    this.countExported = 0
    
    const firstRow = await this.getFirstRow()
    const header = await this.getHeader(firstRow)
    
    await fs.promises.open(this.filePath, 'w+')

    if (header) {
      await this.writeToFile(header)
    }
  }

  async exportData(): Promise<void> {
      const chunk = await this.getChunk(this.countExported, this.options.chunkSize)

      if (!chunk) {
        this.status = Export.Status.Aborted
        return
      }

      for (const formattedRow of this.formatChunk(chunk.result)) {
        await this.writeToFile(formattedRow)
      }

      this.countTotal = chunk.totalRecords
      this.countExported += chunk.result.length
      const stats = await fs.promises.stat(this.filePath)
      this.fileSize = stats.size
      this.calculateTimeLeft()

      if (this.countExported < this.countTotal && this.status === Export.Status.Exporting) {
        await this.exportData()
      }
  }

  async finalizeExport(): Promise<void> {
    const footer = await this.getFooter()

    if (footer) {
      await this.writeToFile(footer)
    }

    this.status = Export.Status.Completed
  }

  async exportToFile(): Promise<void> {
    try {
      await this.initExport()
      await this.exportData()

      if (this.status === Export.Status.Aborted) {
        if (this.options.deleteOnAbort) {
          await this.deleteFile()
        }
        return
      }

      await this.finalizeExport()
    } catch (error) {
      this.status = Export.Status.Error
      this.error = error

      if (this.options.deleteOnAbort) {
        await this.deleteFile()
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
    remote.shell.openPath(this.filePath)
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
