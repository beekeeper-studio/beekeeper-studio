// import { OpenOptions } from "@/background/WindowBuilder"

import { DevLicenseState } from "@/lib/license";
import { CustomMenuAction } from "@/types";

type ElectronWindow = Electron.BrowserWindow | undefined


export interface IMenuActionHandler {
  togglePrimarySidebar: (menuItem: Electron.MenuItem, browserWindow: ElectronWindow) => void
  toggleSecondarySidebar: (menuItem: Electron.MenuItem, browserWindow: ElectronWindow) => void
  quit: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  undo: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  redo: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  cut: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  copy: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  paste: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  selectAll?: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  zoomreset: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  zoomin: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  zoomout: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  editorFontSizeReset: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  editorFontSizeIncrease: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  editorFontSizeDecrease: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  fullscreen: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  about: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  devtools: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  restart: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  opendocs: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  contactSupport: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  newWindow: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  newQuery: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  newTab: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  closeTab: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  quickSearch: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  switchTheme: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  reload: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  disconnect: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  addBeekeeper: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  enterLicense: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  backupDatabase: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  restoreDatabase: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  exportTables: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  upgradeModal: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  checkForUpdates: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  importSqlFiles: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  toggleMinimalMode: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  switchLicenseState: (menuItem: Electron.MenuItem, win: ElectronWindow, state: DevLicenseState) => void
  toggleBeta: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  managePlugins: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  updatePin: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  keyboardShortcuts: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  /** `handleAction` is used by menus that are defined at runtime (unlike other
   * actions) so the signature is a little bit different than the rest. */
  handleAction: (action: Electron.MenuItem | CustomMenuAction, win: ElectronWindow) => void
}
