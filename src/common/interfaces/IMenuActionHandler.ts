export interface IMenuActionHandler {
  quit: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  undo: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  redo: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  cut: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  copy: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  paste: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  selectAll?: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomreset: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomin: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  zoomout: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  fullscreen: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  about: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  devtools: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newWindow: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newQuery: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  newTab: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  closeTab: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  switchTheme: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  switchMenuStyle: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  reload: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  disconnect: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
  addBeekeeper: (menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => void
}
