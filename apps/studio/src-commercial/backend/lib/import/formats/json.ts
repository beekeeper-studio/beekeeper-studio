import fs from 'fs';
import Import from '@/lib/import';
import _ from 'lodash';

export default class extends Import {

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  async read(options, executeOptions?: any, _fileToImport = null): Promise<any> {
    try {
      const jsonStr = fs.readFileSync(this.fileName, 'utf-8')
      const parsedData = JSON.parse(jsonStr) 
      const data = Array.isArray(parsedData) ? parsedData : [parsedData]
      const updatedImportScriptOptions = {
        ...this.importScriptOptions,
        executeOptions: { 
          multiple: true,
          ...executeOptions
        }
      }
      const dataObj = {
        meta: {
          fields: Object.keys(data[0])
        },
        data
      }

      if (!options.isPreview) {
        // This is because currently, we just load the entirety of the file into memory, 
        // and then import it. So we need to manually chunk the data or the drivers will yell at us
        const chunkSize = 1000;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunkEnd = i + chunkSize;
          const slice = _.slice(data, i, chunkEnd > data.length ? data.length  : chunkEnd);
          const importSql = await this.connection.getImportSQL([this.buildDataObj(slice)], this.table.name, this.table.schema || null, updatedImportScriptOptions.storeValues.runAsUpsert)
          await this.connection.importLineReadCommand(this.table, importSql, updatedImportScriptOptions)
        }
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
