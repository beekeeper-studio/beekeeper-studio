import { Export } from "../export";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'

interface OutputOptionsJson {
    prettyprint: boolean
}
export default class JsonExporter extends Export {

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsJson, 
        progressCallback: (countTotal: number, countExported: number, fileSize: number) => void,
        errorCallback: (error: Error) => void
    ) {
        super(fileName, connection, table, filters, outputOptions, progressCallback, errorCallback)
    }

    async getHeader(firstRow: any) {
        return '['
    }

    async getFooter() {
        return ']'
    }

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const spacing = this.outputOptions.prettyprint ? 2 : undefined
            const content = JSON.stringify(row, null, spacing)
            await this.writeLineToFile(content + ',')
        }
    }
}