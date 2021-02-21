import { Export } from "../export";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'
import knexlib from 'knex'

interface OutputOptionsSql {
    createTable: boolean,
    schema: boolean
}
export default class SqlExporter extends Export {
    readonly format: string = 'sql'
    knex: any = null

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsSql
    ) {
        super(fileName, connection, table, filters, outputOptions)

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
            const content = this.knex(this.table.name).withSchema(this.table.schema).insert(row).toQuery()
            await this.writeLineToFile(content + ',')
        }
    }
}