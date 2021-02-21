import { Export } from "../export";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'

interface OutputOptionsCsv {
    header: boolean,
    delimiter: string
}

export default class CsvExporter extends Export {
    readonly format: string = 'csv'

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsCsv, 
    ) {
        super(fileName, connection, table, filters, outputOptions)
    }
    
    async getHeader(firstRow: any) {
        if (firstRow && this.outputOptions.header) {
            return Object.keys(firstRow).join(this.outputOptions.delimiter)
        }
    }

    async getFooter() {}

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const content = Object.values(row).join(this.outputOptions.delimiter)
            await this.writeLineToFile(content)
        }
    }
}