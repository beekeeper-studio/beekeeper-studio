
import { remote } from 'electron'

/*
  Ok this is a little late in the game, but starting to move electron
  remote calls to this object. The hope is that when we support other platforms
  we can swap this out for the other platform

  Stuff this package should have (long term):
  - all database clients
  - file operations (write / read)
  - all electron remote actions
  - anything else that uses regular node
*/
export default {
  clipboard: {
    writeText(text: string) {
      remote.clipboard.writeText(text)
    },
    readText(): string {
      return remote.clipboard.readText()
    }
  },
  files: {
    open(path: string) {
      remote.shell.openPath(path)
    },
    showItemInFolder(path: string) {
      remote.shell.showItemInFolder(path)
    }
  }
}