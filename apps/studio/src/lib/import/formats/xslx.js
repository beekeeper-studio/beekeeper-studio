import fs from 'fs'
import XSLX from 'xlsx'
import Import from "../"

export default class extends Import {
  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  async read(options) {
    const readOptions = {
      type: 'buffer',
      ...options
    }
    let file

    this.clearInsert()

    try {
      file = await XSLX.readFile(this.fileName, readOptions)
    } catch (e) {
      this.logger().error('xslx file read error', e)
      throw new Error(e)
    }

    return new Promise((resolve, reject) => {
      try {
        if (options.bookSheets) {
          resolve(file.SheetNames)
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

        if (options.preview) {
          resolve(dataObj)
        } else {
          this.addInsert(this.mapData(data))
          resolve(dataObj)
        }
      } catch(e) {
        this.logger().error('csv file read error', e)
        reject(e)
      }
    })
  }

  async getPreview(options = {}) {
    return await this.read({ sheetRows: 11, preview: true, ...options})
  }

  async getSheets() {
    return await this.read({ bookSheets: true, preview: true })
  }

  async validateFile() {
    return await this.read(this.getImporterOptions({ isValidate: true }))
  }

}
