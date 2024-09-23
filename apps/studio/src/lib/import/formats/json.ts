import fs from 'fs'
import Import from "../"

export default class extends Import {

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  async read(options, connection?: any, _fileToImport = null): Promise<any> {
    try {
      const jsonStr = fs.readFileSync(this.fileName, 'utf-8')
      const parsedData = JSON.parse(jsonStr) 
      const data = Array.isArray(parsedData) ? parsedData : [parsedData]
      const updatedImportScriptOptions = {
        ...this.importScriptOptions,
        executeOptions: { 
          multiple: true,
          connection
        }
      }
      const dataObj = {
        meta: {
          fields: Object.keys(data[0])
        },
        data
      }

      if (!options.isPreview) {
        const importSql = await this.connection.getImportSQL([this.buildDataObj(data)])
        await this.connection.importLineReadCommand(this.table, importSql, updatedImportScriptOptions)
      }
      return dataObj
    } catch (e) {
      this.logger().error('json file read error', e)
      throw new Error(e)
    }
  }

  async getPreview() {
    const previewData = await this.read({ isPreview: true })
    previewData.data = previewData.data.slice(0, 10)

    return previewData
  }

  async validateFile() {
    return await this.read(this.getImporterOptions({ isValidate: true }))
  }

  autodetectedSettings() {
    return {
      columnDelimeter: false,
      quoteCharacter: false,
      escapeCharacter: false,
      newlineCharacter: false
    }
  }

  allowChangeSettings() {
    return false
  }
}
