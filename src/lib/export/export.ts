import fs from 'fs'
import crypto from 'crypto'
import remote from 'electron'
import { DBConnection, TableOrView, TableFilter, TableResult } from '@/lib/db/client'

export abstract class Export {
  id: string
  chunkSize: number = 500
  connection: DBConnection
  countExported: number = 0
  countTotal: number = 0
  error: Error | null = null
  fileName: string
  fileSize: number = 0
  filters: TableFilter[] | any[]
  lastChunkTime: number = 0
  outputOptions: any
  showNotification: boolean = true
  status: Export.Status = Export.Status.Idle
  table: TableOrView
  timeLeft: number = 0

  abstract getHeader(firstRow: any): Promise<string | void>
  abstract getFooter(): Promise<string | void>
  abstract formatChunk(data: any): string[]

  constructor(
    fileName: string,
    connection: DBConnection,
    table: TableOrView,
    filters: TableFilter[] | any[],
    outputOptions: any
  ) {
    this.fileName = fileName
    this.connection = connection
    this.table = table
    this.filters = filters
    this.outputOptions = outputOptions
    this.id = this.generateId()
  }

  generateId(): string {
    const md5sum = crypto.createHash('md5')

    md5sum.update(Date.now().toString(), 'utf8')
    md5sum.update(this.table.name)
    md5sum.update(this.fileName)

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
    return await fs.promises.appendFile(this.fileName, content + "\n")
  }

  async deleteFile() {
    return await fs.promises.unlink(this.fileName)
  }

  async exportToFile(): Promise<any> {
    try {
      const firstRow = await this.getFirstRow()
      const header = await this.getHeader(firstRow)
      const footer = await this.getFooter()

      this.countExported = 0
      this.status = Export.Status.Exporting

      await fs.promises.open(this.fileName, 'w+')

      if (header) {
        await this.writeToFile(header)
      }

      do {
        const chunk = await this.getChunk(this.countExported, this.chunkSize)

        if (!chunk) {
          this.status = Export.Status.Aborted
          continue
        }

        for (const formattedRow of this.formatChunk(chunk.result)) {
          await this.writeToFile(formattedRow)
        }

        this.countTotal = chunk.totalRecords
        this.countExported += chunk.result.length
        const stats = await fs.promises.stat(this.fileName)
        this.fileSize = stats.size
        this.calculateTimeLeft()
      } while (this.countExported < this.countTotal && this.status === Export.Status.Exporting)

      if (this.status === Export.Status.Aborted) {
        await this.deleteFile()
        return Promise.reject()
      }

      if (footer) {
        await this.writeToFile(footer)
      }

      this.status = Export.Status.Completed

      return Promise.resolve()
    } catch (error) {
      this.status = Export.Status.Error
      this.error = error
    }
  }

  calculateTimeLeft(): void {
    if (this.lastChunkTime) {
      const lastChunkDuration = Date.now() - this.lastChunkTime
      const chunksLeft = Math.round((this.countTotal - this.countExported) / this.chunkSize)

      this.timeLeft = chunksLeft * lastChunkDuration
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
    remote.shell.openPath(this.fileName)
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