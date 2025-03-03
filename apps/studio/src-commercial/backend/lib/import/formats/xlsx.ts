import XLSX from 'xlsx';
import fs from 'fs';
import Import from '@/lib/import';
import _ from 'lodash';

export default class extends Import {
  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  async read(options, executeOptions?: any) {
    XLSX.set_fs(fs);
    const readOptions = {
      type: 'buffer',
      ...options
    }
    const updatedImportScriptOptions = {
      ...this.importScriptOptions,
      executeOptions: { 
        multiple: true,
        ...executeOptions
      }
    }
    let file: XLSX.WorkBook;

    try {
      file = XLSX.readFile(this.fileName, readOptions)
      if (options.bookSheets) {
        return file.SheetNames
      }
      const sheetName = readOptions.sheet ?? file.SheetNames[0]
      const parsedData = XLSX.utils.sheet_to_json(file.Sheets[sheetName], { raw: false })
      const data = Array.isArray(parsedData) ? parsedData : [parsedData]
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
    } catch(e) {
      this.logger().error('xlsx file read error', e)
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
