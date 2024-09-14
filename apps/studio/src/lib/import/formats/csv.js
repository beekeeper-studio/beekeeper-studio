import fs from 'fs'
import Papa from 'papaparse'
import Import from "../"
export default class extends Import {
  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }
  
  read(option) {
    this.clearInsert()
    try {
      return new Promise((complete, error) => {
        Papa.parse(fs.createReadStream(this.fileName), {...option, complete, error})
      })
    } catch (err) {
      throw new Error(err)
    }
  }

  async getPreview() {
    return await this.read(this.getImporterOptions({isPreview: true}))
  }

  getImporterOptions({isPreview = false, isValidate = false}) {
    const options = {
      delimiter: this.options.columnDelimeter,
      quoteChar: this.options.quoteCharacter,
      escapeChar: this.options.escapeCharacter,
      newline: this.options.newlineCharacter,
      header: this.options.useHeaders,
      skipEmptyLines: true,
    }

    if (isPreview) {
      options.preview = 10
    } else {
      options.chunk = ({ data, errors }, _parser) => {
        if (errors && errors.length > 0) {
          this.logger().error('csv file read error', errors)
          if (Array.isArray(errors)) {
            const errorSet = new Set()
            errors.forEach(e => {
              errorSet.add(e?.message || e)
            })
            throw new Error(Array.from(errorSet).join(', '))
          }
          throw new Error(errors)
        }
        if (!isValidate) {
          const rowData = this.mapData(data)
          this.addInsert(rowData)
        }
      }
    }

    return options
  }

  async validateFile() {
    return await this.read(this.getImporterOptions({isValidate: true}))
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
