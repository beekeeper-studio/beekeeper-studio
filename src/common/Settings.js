import { promises, readFileSync, existsSync } from "fs";
import platformInfo from './platform_info'
import path from 'path'

class JsonLoader {

  data = {}
  filePath = null

  constructor(filePath, load) {
    console.log("json loader for ", filePath)
    this.filePath = filePath
    if (load && existsSync(this.filePath)) {
      console.log('loading sync')
      this.data = JSON.parse(readFileSync(this.filePath))
    }
  }

  async reload() {
    try {
      const stat = await promises.stat(this.filePath)
      if (stat.isFile) {
        this.data = JSON.parse(await promises.readFile(this.filePath))
      }
    } catch (error) {
      console.error(`could not reload settings ${error.message}`)
    }
  }

  async save() {
    console.log("saving to file ", this.filePath)
    await promises.writeFile(this.filePath, JSON.stringify(this.data))
  }
}


export default class extends JsonLoader {

  constructor(userDirectory, loadNow) {
    super(path.join(userDirectory, 'settings.json'), loadNow)
  }

  get theme() {
    return this.data.theme || 'dark'
  }

  set theme(updated) {
    if(['light', 'dark'].includes(updated)) this.data.theme = updated
    this.save()
  }

  get menuStyle() {
    const defaultStyle = platformInfo.isWindows ? 'client' : 'native'
    return this.data.menuStyle || defaultStyle
  }

  set menuStyle(updated) {
    if (['native', 'client'].includes(updated)) this.data.menuStyle = updated
    this.save()
  }

}