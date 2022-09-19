
import { remote } from 'electron'
import Noty from 'noty'
import _ from 'lodash'
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

export interface NativePlugin {
  clipboard: {
    writeText(text: string): void
    readText(): string
  },
  files: {
    open(path: string): Promise<string>
    showItemInFolder(path: string): void
  }
}

const copyNotification = new Noty({
  text: "Text copied to clipboard",
  layout: "bottomRight",
  queue: "clipboard",
  timeout: 2000,
})

export const ElectronPlugin: NativePlugin = {
  clipboard: {
    writeText(rawText: any, notify: boolean = true) {
      const text = _.toString(rawText)
      Noty.closeAll('clipboard')
      remote.clipboard.writeText(text)

      if (!notify) return;
      copyNotification.show()
    },
    readText(): string {
      return remote.clipboard.readText()
    }
  },
  files: {
    open(path: string) {
      return remote.shell.openPath(path)
    },
    showItemInFolder(path: string) {
      remote.shell.showItemInFolder(path)
    }
  }
}

export const VueElectronPlugin = {
  install(Vue: any) {
    Vue.prototype.$native = ElectronPlugin
  }
}
