import fs from 'fs'
import Papa, { ParseLocalConfig, ParseResult } from 'papaparse'
import Import from "@/lib/import"
import rawLog from '@bksLogger'
const log = rawLog.scope('CSVImporter')

export default class extends Import {
  error: string;

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  read(options: any, executeOptions?: any, fileToImport = null): Promise<any> {
    if (!options.preview) {
       options.chunk = (async ({ data, errors }, parser) => {
        if (!executeOptions.connection && !executeOptions.transaction && !executeOptions.request) {
          this.error = "No connection available";
          parser.abort();
          return;
        }

        if (errors && errors.length > 0) {
          this.logger().error('csv file read error', errors)
          if (Array.isArray(errors)) {
            const errorSet = new Set()
            errors.forEach(e => {
              errorSet.add(e?.message || e)
            })
            this.error = Array.from(errorSet).join(', ');
            parser.abort();
          }
          // I don't think this should be able to happen, we shall see
          this.error = errors.join(', ');
          parser.abort();
        }

        if (!data || data?.length == 0) return;
        log.info(`Importing ${data?.length} records`)

        const importData = [];
        if (this.connection.connectionType === 'firebird') {
          this.mapData(data).forEach((value) => {
            importData.push({
              data: [value],
              table: this.table.name,
              schema: this.table.schema || null
            })
          })
        } else {
          importData.push({
            data: this.mapData(data),
            table: this.table.name,
            schema: this.table.schema || null
          })
        }
      
        parser.pause()
        try {
          const updatedImportScriptOptions = {
            ...this.importScriptOptions,
            executeOptions: {
              multiple: true,
              ...executeOptions
            }
          }

          const importSQL = await this.connection.getImportSQL(importData, this.table.name, this.table.schema || null, updatedImportScriptOptions.storeValues.runAsUpsert);
          await this.connection.importLineReadCommand(this.table, importSQL, updatedImportScriptOptions)
        } catch (err) {
          this.error = err;
          parser.abort()
          return;
        }
        parser.resume()
      }).bind(this);     
    }

    // complete or error will tell the "importFile" function if it should commit or rollback
    const fileName = fileToImport ?? this.fileName

    return new Promise((resolve, error) => {
      const complete = (result: ParseResult<any>) => {
        resolve({
          aborted: result?.meta?.aborted,
          error: this.error,
          data: result?.data,
          meta: result?.meta
        })
      }
      try {
        Papa.parse(fs.createReadStream(fileName), {...options, complete: complete.bind(this), error})
      } catch (err) {
        error(err?.message ?? err)
      }
    })
  }

  async getPreview(): Promise<void> {
    return await this.read(this.getImporterOptions({ isPreview: true }))
  }

  getImporterOptions({ isPreview = false }) {
    const options: ParseLocalConfig = {
      delimiter: this.options.columnDelimeter,
      quoteChar: this.options.quoteCharacter,
      escapeChar: this.options.escapeCharacter,
      newline: this.options.newlineCharacter,
      header: this.options.useHeaders,
      skipEmptyLines: true,
      complete: null
    }

    if (isPreview) {
      options.preview = 10
    }

    return options
  }

  async validateFile() {
    // return await this.read(this.getImporterOptions({isValidate: true}))
  }

  allowChangeSettings() {
    return true
  }

  autodetectedSettings() {
    return {
      columnDelimeter: true,
      quoteCharacter: false,
      escapeCharacter: false,
      newlineCharacter: true
    }
  }
}
