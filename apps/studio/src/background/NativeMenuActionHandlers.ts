import _ from 'lodash'
import {AppEvent} from '../common/AppEvent'
import { buildWindow, getActiveWindows, OpenOptions } from './WindowBuilder'
import { app , shell } from 'electron'
import platformInfo from '../common/platform_info'
import path from 'path'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { autoUpdater } from "electron-updater"

type ElectronWindow = Electron.BrowserWindow | undefined

function getIcon() {
  const iconPrefix = platformInfo.environment === 'development' ? 'public' : ''
  return path.resolve(path.join(__dirname, '..', `${iconPrefix}/icons/png/512x512.png`))
}

export default class NativeMenuActionHandlers implements IMenuActionHandler {
  constructor(private settings: IGroupedUserSettings) {}

  quit(): void {
    app.quit()
  }

  undo(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) {
      win.webContents.undo()
    }
  }
  redo(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.redo()
  }
  cut(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.cut()
  }
  copy(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.copy()
  }
  paste(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.paste()
  }
  selectAll(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.selectAll()
  }

  setZoom = async (level: number): Promise<void> => {
    getActiveWindows().forEach(window => {
      if (window.webContents) {
        window.webContents.zoomLevel = level
      }
    })
    this.settings.zoomLevel.value = level
    await this.settings.zoomLevel.save()
  }

  zoomreset = async (): Promise<void> => {
    await this.setZoom(0)
  }
  zoomin = async (_1: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) await this.setZoom(win.webContents.zoomLevel + 0.5)
  }
  zoomout = async (_1: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) await this.setZoom(win.webContents.zoomLevel - 0.5)
  }

  reload = async (_1: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) win.webContents.reloadIgnoringCache()
  }

  fullscreen(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.setFullScreen(!win.isFullScreen())
  }
  about(): void {
    app.setAboutPanelOptions({
      applicationName: "Beekeeper Studio",
      applicationVersion: app.getVersion(),
      copyright: "Beekeeper Studio Team",
      authors: ["Matthew Rathbone", "Gregory Garden", "All the wonderful Github contributors"],
      website: "https://beekeeperstudio.io",
      iconPath: getIcon()
    })
    app.showAboutPanel()
  }

  opendocs(): void {
    shell.openExternal("https://docs.beekeeperstudio.io/")
  }

  checkForUpdates(menuItem: Electron.MenuItem, win: Electron.BrowserWindow): void {
    autoUpdater.checkForUpdates()
  }

  devtools(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.toggleDevTools()
  }

  // first argument when coming from the ipcRenderer when opening a new window via new database doesn't return the same arguments as going through menu natively
  // Having said that, it can accept openoptions too and do it's thing
  newWindow = (options: Electron.MenuItem|OpenOptions = {}): void => {
    // typescript isn't happy that url doesn't exist on MenuItem, which shouldn't matter because we're checking to see if it exists, but TS gonna TS.
    if ((options as any)?.url) {
      return buildWindow(this.settings, <OpenOptions>options)
    }

    return buildWindow(this.settings)
  }

  newQuery = (_1: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.newTab)
  }

  enterLicense = (_menuItem: Electron.MenuItem, win: Electron.BrowserWindow) => {
    if (win) win.webContents.send(AppEvent.enterLicense)
  }

  newTab = this.newQuery
  closeTab = (_1: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.closeTab)
  }

  quickSearch = (_1: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.quickSearch)
  }

  switchTheme = async (menuItem: Electron.MenuItem): Promise<void> => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.theme.userValue = label.toLowerCase().replaceAll(" ", "-")
    await this.settings.theme.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.settingsChanged)
    })
  }

  addBeekeeper = async (_1: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    const existing = await SavedConnection.findOne({where: { defaultDatabase: platformInfo.appDbPath }})
    if (!existing) {
      const nu = new SavedConnection()
      nu.connectionType = 'sqlite'
      nu.defaultDatabase = platformInfo.appDbPath
      nu.name = "Beekeeper's Database"
      nu.labelColor = 'orange'
      await nu.save()
    }
    if (win) win.webContents.send(AppEvent.beekeeperAdded)
  }

  switchMenuStyle = async (menuItem: Electron.MenuItem): Promise<void> => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    this.settings.menuStyle.value = label.toLowerCase()
    await this.settings.menuStyle.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.menuStyleChanged)
    })
  }

  toggleSidebar = async(_menuItem: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) win.webContents.send(AppEvent.toggleSidebar)
  }

  disconnect = (_1: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.disconnect)
  }

  backupDatabase = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.backupDatabase)
  }

  restoreDatabase = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.restoreDatabase)
  }

  exportTables = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.exportTables)
  }

  upgradeModal = (_menuItem: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.upgradeModal);
  }

  importSqlFiles = (_menuItem: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.promptSqlFilesImport);
  }
}
