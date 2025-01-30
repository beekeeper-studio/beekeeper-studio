
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

  openLink(link: string): void
  dialog: IWindowDialog

}



export const ElectronPlugin: NativePlugin = {
  dialog: {
    showOpenDialogSync: (any) => window.main.showOpenDialogSync(any),
    showSaveDialogSync: (any) => window.main.showSaveDialogSync(any)
  },
  openLink(link: string) {
    window.main.openLink(link);
  },
  clipboard: {
    writeText(rawText: any, notify = true) {
      const copyNotification = new Noty({
        text: "Text copied to clipboard",
        layout: "bottomRight",
        queue: "clipboard",
        timeout: 2000,
      })
      const text = _.toString(rawText)
      Noty.closeAll('clipboard')
      window.main.writeTextToClipboard(text)

      if (!notify) return;
      copyNotification.show()
    },
    readText(): string {
      return window.main.readTextFromClipboard()
    }
  },
  files: {
    open(path: string) {
      return window.main.openPath(path)
    },
    showItemInFolder(path: string) {
      window.main.showItemInFolder(path)
    }
  }
}

export const VueElectronPlugin = {
  install(Vue: any) {
    Vue.prototype.$native = ElectronPlugin
  }
}
