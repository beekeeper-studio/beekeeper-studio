import { abstractExportFormat } from "../format";

export default class CsvExporter extends abstractExportFormat {
    async getHeader(firstRow: any) {
        if (firstRow && this.outputOptions.header) {
            return Object.keys(firstRow).join(this.outputOptions.delimiter)
        }
        return ''
    }

    async getFooter() {
        return ''
    }

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const content = Object.values(row).join(this.outputOptions.delimiter)
            const writeResult = await this.writeLineToFile(content)
        }
    }
}