import { abstractExportFormat } from "../format";

export class CsvExporter extends abstractExportFormat {
    getHeader() {
        return 'HEADER'
    }

    getFooter() {
        return ''
    }

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const content = Object.values(row).join(';')
            const writeResult = await this.writeLineToFile(content)
        }
    }
}