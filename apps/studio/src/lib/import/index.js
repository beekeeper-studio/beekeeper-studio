import _ from 'lodash'
import logRaw from 'electron-log'

export default class Import {
  constructor(fileName, options, connection, table) {
    const log = logRaw.scope('import-file')
    this.fileName = fileName
    this.options = options
    this.connection = connection
    this.table = table
    this.sqlInserts = []
    this.logger = () => log
  }

  #sqlInserts = []

  clearInsert() {
    this.sqlInserts = []
  }

  setOptions(opt) {
    this.options = opt
  }

  addInsert(insertArr) {
    insertArr.forEach(data => {
      this.sqlInserts.push({
        data: [data],
        table: this.table.name,
        schema: this.table.schema || null
      })
    })
  }
  
  async buildSQL() {
    await this.read(this.getImporterOptions({ preview: false }))
    return this.connection.getImportSQL(this.sqlInserts, this.options.truncateTable)
  }

  async importFile() {
    const sql = await this.buildSQL()
    return await this.connection.importData(sql)
  }

  /**
   * 
   * @param {Object[]} dataMap an array of file header -> column name (tabulator getData())
   * @param dataMap.fileColumn
   * @param dataMap.tableColumn
   * @returns {Object[]} a filtered array of file header and columns names minus any ignores or empty strings
   */
  mapper (dataMap) {
    return dataMap
      .filter(t => t.tableColumn !== '' && t.tableColumn.toUpperCase().trim() !== 'IGNORE')
      .map(({fileColumn, tableColumn}) => {
        return {
          fileColumn,
          tableColumn
        }
      })
  }

  /**
   * 
   * @param {Object[]} rawData an array of file header -> column name (tabulator getData())
   * @param rawData.fileColumn
   * @param rawData.tableColumn
   * @returns {Object} mapped data array and columns object
   */
  mapRawData (rawData) {
    const data = rawData.data.map(d => {
      for(const key in d) {
        let importedValue = null
        importedValue = this.options.trimWhitespaces && _.isString(d[key]) ? d[key].trim() : d[key]
        if (_.isString(d[key]) && this.options.nullableValues.includes(importedValue.toUpperCase().trim())) {
          importedValue = null
        }
        d[key] = importedValue
      }
      return d
    })

    const columns = rawData.meta.fields.map(field => ({
      title: field,
      field
    }))

    return {
      columns,
      data
    }
  }

  /**
   * 
   * @param {Object[]} data a JSON object of the data to be mapped
   * @returns {Object[]} An array of objects of the data
   */
  mapData (data) {
    return data.map(d =>
      this.options.importMap.reduce((acc, m) => {
        const columnData = d[m.fileColumn]
        let importedValue = null

        if (columnData != null) {
          if (this.options.trimWhitespaces && _.isString(columnData)) {
            importedValue = this.connection.escapeString(columnData).trim()
          } else if (_.isString(columnData)) {
            importedValue = this.connection.escapeString(columnData)
          } else {
            importedValue = columnData
          }

          if (this.options.nullableValues.includes(importedValue.toString().toUpperCase().trim())) {
            importedValue = null
          }
        }
        acc[m.tableColumn] = importedValue
        return acc
      }, {})
    )
  }

  allowChangeSettings() {
    return false
  }

  getImporterOptions(opt) {
    return opt
  }

  read() {
    throw new Error("Method 'read()' must be implemented.")
  }

  getPreview() {
    throw new Error("Method 'getPreview()' must be implemented.")
  }

  autodetectedSettings() {
    return {
      columnDelimeter: false,
      quoteCharacter: false,
      escapeCharacter: false,
      newlineCharacter: false
    }
  }

  validateFile() {
    throw new Error("Method 'validateFile()' must be implemented")
  }
}