import { abstractExportFormat } from "../format";

export class JsonExporter extends abstractExportFormat {
    getHeader() {
        return '['
    }

    getFooter() {
        return ']'
    }

    async writeChunkToFile(data: any) {
        for (const row of data) {
            const content = JSON.stringify(row, null, 2)
            const writeResult = await this.writeLineToFile(content + ',')
        }
    }
}