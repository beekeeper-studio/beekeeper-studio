import XSLX from 'xlsx'
import Import from "../"

export default class extends Import {
  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  async read(options, connection?: any) {
    const readOptions = {
      type: 'buffer',
      ...options
    }
    const updatedImportScriptOptions = {
      ...this.importScriptOptions,
      executeOptions: { 
        multiple: true,
        connection
      }
    }
    let file

    try {
      file = XSLX.readFile(this.fileName, readOptions)
      if (options.bookSheets) {
        return file.SheetNames
      }
      const sheetName = readOptions.sheet ?? file.SheetNames[0]
      const parsedData = XSLX.utils.sheet_to_json(file.Sheets[sheetName])
      const data = Array.isArray(parsedData) ? parsedData : [parsedData]
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
    } catch(e) {
      this.logger().error('xslx file read error', e)
      throw new Error(e)
    }
  }

  async getPreview(options = {}) {
    return await this.read({ sheetRows: 11, isPreview: true, ...options})
  }

  async getSheets() {
    return await this.read({ bookSheets: true, isPreview: true })
  }

  async validateFile() {
    return await this.read(this.getImporterOptions({ isValidate: true }))
  }

}
