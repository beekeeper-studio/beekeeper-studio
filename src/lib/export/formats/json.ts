import { abstractExportFormat } from "../format";

export default class JsonExporter extends abstractExportFormat {
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
            const writeResult = await this.writeLineToFile(content + ',')
        }
    }
}