import { abstractExportFormat } from "../format";
import knexlib from 'knex'

export default class SqlExporter extends abstractExportFormat {
    knex: any = null

    async getHeader(firstRow: any) {
        if (this.outputOptions.createTable) {
            return await this.connection.getTableCreateScript(this.table, '')
        }
        return ''
    }

    async getFooter() {
        return ''
    }

    async writeChunkToFile(data: any) {

        if (!this.knex) {
            this.knex = knexlib({ client: this.connection.server.config.client})
        }

        for (const row of data) {
            const content = this.knex(this.table).insert(row).toQuery()
            const writeResult = await this.writeLineToFile(content + ',')
        }
    }
}