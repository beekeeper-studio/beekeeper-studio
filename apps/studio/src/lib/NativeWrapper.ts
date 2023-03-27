
import Noty from 'noty'
import _ from 'lodash'

const remote = require('@electron/remote')
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

interface IWindowDialog {
  showSaveDialogSync(any): void
  showOpenDialogSync(any): void
}

export interface NativePlugin {
  clipboard: {
    writeText(text: string): void
    readText(): string
  },
  files: {
    open(path: string): Promise<string>
    showItemInFolder(path: string): void
  },

  getCurrentWindow(): Electron.BrowserWindow | null
  openLink(link: string): void
  dialog: IWindowDialog

}

const copyNotification = new Noty({
  text: "Text copied to clipboard",
  layout: "bottomRight",
  queue: "clipboard",
  timeout: 2000,
})

export const ElectronPlugin: NativePlugin = {
  dialog: {
    showOpenDialogSync: (any) => remote.dialog.showOpenDialogSync(any),
    showSaveDialogSync: (any) => remote.dialog.showSaveDialogSync(any)
  },
  openLink(link: string) {
    remote.shell.openExternal(link);
  },
  getCurrentWindow() {
    return remote.getCurrentWindow()
  },
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
