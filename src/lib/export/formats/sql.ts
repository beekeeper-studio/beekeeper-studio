import { Export } from "../export";
import { DBConnection, TableOrView, TableFilter } from '../../db/client'
import knexlib from 'knex'

interface OutputOptionsSql {
    createTable: boolean,
    schema: boolean
}
export default class SqlExporter extends Export {
    readonly format: string = 'sql'
    readonly knexTypes: any = {
        "cockroachdb": "pg",
        "mariadb": "mysql2",
        "mysql": "mysql2",
        "postgresql": "pg",
        "sqlite": "sqlite3",
        "sqlserver": "mssql"
    }
    knex: any = null

    constructor(
        fileName: string, 
        connection: DBConnection, 
        table: TableOrView, 
        filters: TableFilter[] | any[], 
        outputOptions: OutputOptionsSql
    ) {
        super(fileName, connection, table, filters, outputOptions)

        if (!this.connection.connectionType || !this.knexTypes[this.connection.connectionType]) {
            throw new Error("SQL export not supported on connectiont type " + this.connection.connectionType)
        }

        this.knex = knexlib({ client: this.knexTypes[this.connection.connectionType] || undefined})
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
            await this.writeToFile(content + ',')
        }
    }
}