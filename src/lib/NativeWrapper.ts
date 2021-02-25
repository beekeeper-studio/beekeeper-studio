
import { remote } from 'electron'

export default {
  clipboard: {
    writeText(text: string) {
      remote.clipboard.writeText(text)
    },
    readText(): string {
      return remote.clipboard.readText()
    }
  }
}