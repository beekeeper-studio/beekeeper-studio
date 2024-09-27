import fs from 'fs'
import Import from "../"

export default class extends Import {

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  read(options) {
    this.clearInsert()
    return new Promise((resolve, reject) => {
      try {
        const jsonStr = fs.readFileSync(this.fileName, 'utf-8')
        const parsedData = JSON.parse(jsonStr) 
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
      } catch (e) {
        this.logger().error('json file read error', e.message)
        reject (e.message)
      }
    })
  }

  async getPreview() {
    const previewData = await this.read({preview: true})
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