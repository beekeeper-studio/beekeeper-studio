import fs from 'fs'
import { DBConnection, TableOrView, TableFilter, TableResult } from '../db/client'

export abstract class abstractExportFormat {
    fileName: string = ''
    connection: DBConnection
    table: TableOrView
    filters: TableFilter[] | any[] = []
    outputOptions: any = {}
    aborted: boolean = false
    progressCallback: (countTotal: number, countExported: number, fileSize: number) => void
    errorCallback: (error: Error) => void

    abstract getHeader(firstRow: any): Promise<string | void>
    abstract getFooter(): Promise<string | void>
    abstract writeChunkToFile(data: any): Promise<void>

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: any, 
        progressCallback: (countTotal: number, countExported: number, fileSize: number) => void,
        errorCallback: (error: Error) => void
    ) {
        this.fileName = fileName
        this.connection = connection
        this.table = table
        this.filters = filters
        this.outputOptions = outputOptions
        this.progressCallback = progressCallback
        this.errorCallback = errorCallback
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
    
    async writeLineToFile(content: string) {
        return await fs.promises.appendFile(this.fileName, content + "\n")
    }

    async deleteFile() {
        return await fs.promises.unlink(this.fileName)
    }

    async exportToFile(): Promise<any> {
        console.log('connection', this.connection)
        const chunkSize = 250
        const firstRow = await this.getFirstRow()
        const header = await this.getHeader(firstRow)
        const footer = await this.getFooter()

        let countExported = 0
        let countTotal = 0

        await fs.promises.open(this.fileName, 'w+')

        if (header) {
            await this.writeLineToFile(header)
        }
        
        do {
            const chunk = await this.getChunk(countExported, chunkSize)

            if (!chunk) {
                this.aborted = true
                continue
            }

            await this.writeChunkToFile(chunk.result)
            
            countTotal = chunk.totalRecords
            countExported += chunk.result.length
            const stats = await fs.promises.stat(this.fileName)
            this.progressCallback(countTotal, countExported, stats.size)
        } while (countExported < countTotal && !this.aborted)

        if (this.aborted) {
            await this.deleteFile()
            return Promise.reject()
        }

        if (footer) {
            await this.writeLineToFile(footer)
        }

        return Promise.resolve()
    }

    abort(): void {
        this.aborted = true
    }
}