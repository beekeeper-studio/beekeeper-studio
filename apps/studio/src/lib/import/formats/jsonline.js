import fs from 'fs'
import _ from 'lodash'
import JSONImporter from "./json"

export default class extends JSONImporter {

  constructor(filePath, options, connection, table) {
    super(filePath, options, connection, table)
  }

  read(options) {
    this.clearInsert()
    return new Promise((resolve, reject) => {
      try {
        const jsonStr = fs.readFileSync(this.fileName, 'utf-8')
        const data = jsonStr
          .split(/\r?\n|\r|\n/g)
          .map(this.handleObjectParse)
          .filter(v => v != null && v !== '')
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
        this.logger().error('jsonline file read error', e.message)
        reject (e.message)
      }
    })
  }

  handleObjectParse(val, index, arr) {
    if (val === '') {
      return null
    }

    const parsedValue = JSON.parse(val)
    if (_.isArray(parsedValue) && index === 0) {
      return null
    }

    if (_.isArray(parsedValue)) {
      const headers = JSON.parse(arr[0])
      return _.zipObject(headers, parsedValue)
    } 

    return parsedValue
  }

}