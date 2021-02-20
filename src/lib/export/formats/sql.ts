import { abstractExportFormat } from "../format";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'
import knexlib from 'knex'

interface OutputOptionsSql {
    createTable: boolean
}
export default class SqlExporter extends abstractExportFormat {
    knex: any = null

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsSql, 
        progressCallback: (countTotal: number, countExported: number, fileSize: number) => void,
        errorCallback: (error: Error) => void
    ) {
        super(fileName, connection, table, filters, outputOptions, progressCallback, errorCallback)

        this.knex = knexlib({ client: this.connection.connectionType || undefined})
    }

    async getHeader(firstRow: any) {
        if (this.outputOptions.createTable) {
            return this.connection.getTableCreateScript(this.table.name, '')
        }
    }

    async getFooter() {}

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const content = this.knex(this.table.name).insert(row).toQuery()
            await this.writeLineToFile(content + ',')
        }
    }
}