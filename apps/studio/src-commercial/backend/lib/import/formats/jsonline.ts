import fs from 'fs'
import readline from 'readline'
import _ from 'lodash'
import JSONImporter from "./json"

export default class extends JSONImporter {

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  arrayHeaders = []

  async read(options, executeOptions?: any) {
    const isPreview = options.isPreview ?? false
    let finalPreviewLines = []

    try {
      const readStream = fs.createReadStream(this.fileName)
      const updatedImportScriptOptions = {
        ...this.importScriptOptions,
        executeOptions: { 
          multiple: true,
          ...executeOptions
        }
      }
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
      })

      for await (const line of rl) {
        try {
          const lineData = this.handleObjectParse(line)
          if (lineData && finalPreviewLines.length <= 10) {
            finalPreviewLines.push(lineData)
          }
          if (isPreview && finalPreviewLines.length === 10) {
            break;
          }
          
          if (!isPreview) {
            const importData = this.buildDataObj([lineData])
            const importSql = await this.connection.getImportSQL([importData], this.table.name, this.table.schema || null, updatedImportScriptOptions.storeValues.runAsUpsert)
            await this.connection.importLineReadCommand(this.table, importSql, updatedImportScriptOptions)
          }
        } catch (err) {
          throw new Error(err)
        }
      }

      if (isPreview && finalPreviewLines.length === 0) {
        return {
          meta: {
            fields: []
          },
          data: []
        }
      }
      if (isPreview) {
        return {
          meta: {
            fields: Object.keys(finalPreviewLines[0])
          },
          data: finalPreviewLines
        }
      }

      return {
        meta: {
          fields: Object.keys(finalPreviewLines[0])
        },
        data: finalPreviewLines
      }
    } catch (err) {
      this.logger().error('error reading jsonline file')
      throw new Error(err)
    } finally {
      finalPreviewLines = []
    }
  }

  async getPreview() {
    return await this.read(this.getImporterOptions({isPreview: true}))
  }

  handleObjectParse(val) {
    if (!val || val === '') {
      return null
    }

    const parsedValue = JSON.parse(val)
    if (_.isArray(parsedValue) && this.arrayHeaders.length === 0) {
      this.arrayHeaders = parsedValue
      return null
    }

    if (_.isArray(parsedValue)) {
      return _.zipObject(this.arrayHeaders, parsedValue)
    } 

    return parsedValue
  }

}
