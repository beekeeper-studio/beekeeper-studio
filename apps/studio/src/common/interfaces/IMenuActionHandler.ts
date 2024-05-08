import { OpenOptions } from "@/background/WindowBuilder"

type ElectronWindow = Electron.BrowserWindow | undefined


export interface IMenuActionHandler {
  toggleSidebar: (menuItem: Electron.MenuItem, browserWindow: ElectronWindow) => void
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
  fullscreen: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  about: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  devtools: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  opendocs: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  newWindow: (menuItem: Electron.MenuItem|OpenOptions, win: ElectronWindow) => void
  newQuery: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  newTab: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  closeTab: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  quickSearch: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  switchTheme: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
  switchMenuStyle: (menuItem: Electron.MenuItem, win: ElectronWindow) => void
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
}
