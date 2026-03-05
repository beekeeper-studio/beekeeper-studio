import _ from 'lodash'
import {AppEvent} from '../common/AppEvent'
import { buildWindow, getActiveWindows, OpenOptions } from './WindowBuilder'
import { app , shell } from 'electron'
import platformInfo from '../common/platform_info'
import path from 'path'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { autoUpdater } from "electron-updater"
import { DevLicenseState } from '@/lib/license';
import { setAllowBeta } from './update_manager'
import { CustomMenuAction } from '@/types'

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

  setEditorFontSize = async (size: number): Promise<void> => {
    const MIN_SIZE = 10
    const MAX_SIZE = 24
    const boundedSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size))

    this.settings.editorFontSize.value = boundedSize
    await this.settings.editorFontSize.save()
    getActiveWindows().forEach(window => {
      window.send(AppEvent.settingsChanged, 'editorFontSize')
    })
  }

  editorFontSizeReset = async (): Promise<void> => {
    await this.setEditorFontSize(14)
  }

  editorFontSizeIncrease = async (): Promise<void> => {
    const currentSize = (this.settings.editorFontSize?.value as number) || 14
    await this.setEditorFontSize(currentSize + 2)
  }

  editorFontSizeDecrease = async (): Promise<void> => {
    const currentSize = (this.settings.editorFontSize?.value as number) || 14
    await this.setEditorFontSize(currentSize - 2)
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

  contactSupport(): void {
    shell.openExternal("https://docs.beekeeperstudio.io/support/contact-support/")
  }

  checkForUpdates(_menuItem: Electron.MenuItem, _win: Electron.BrowserWindow): void {
    autoUpdater.checkForUpdates()
  }

  devtools(_1: Electron.MenuItem, win: ElectronWindow): void {
    if (win) win.webContents.toggleDevTools()
  }

  restart(): void {
    app.relaunch();
    app.quit();
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
      window.send(AppEvent.settingsChanged, 'theme')
    })
  }

  addBeekeeper = async (_1: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) win.webContents.send(AppEvent.beekeeperAdded)
  }

  togglePrimarySidebar = async(_menuItem: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) win.webContents.send(AppEvent.togglePrimarySidebar)
  }

  toggleSecondarySidebar = async(_menuItem: Electron.MenuItem, win: ElectronWindow): Promise<void> => {
    if (win) win.webContents.send(AppEvent.toggleSecondarySidebar)
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

  toggleMinimalMode = async (): Promise<void> => {
    this.settings.minimalMode.value = !this.settings.minimalMode.value
    await this.settings.minimalMode.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.settingsChanged)
    })
  }

  switchLicenseState = async (state: Electron.MenuItem | DevLicenseState, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.switchLicenseState, state)
  }

  toggleBeta = async (menuItem: Electron.MenuItem): Promise<void> => {
    const label = _.isString(menuItem) ? menuItem : menuItem.label
    const beta = label.toLowerCase() == 'beta';
    this.settings.useBeta.userValue = beta;
    await this.settings.useBeta.save()
    getActiveWindows().forEach( window => {
      window.send(AppEvent.settingsChanged)
    })
    setAllowBeta(this.settings.useBeta.value as boolean);
    autoUpdater.checkForUpdates();
  }

  managePlugins = (_menuItem: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.openPluginManager);
  }

  keyboardShortcuts = (_menuItem: Electron.MenuItem, win: ElectronWindow): void => {
    if (win) win.webContents.send(AppEvent.openKeyboardShortcuts);
  }

  updatePin = (_1: Electron.MenuItem, win: ElectronWindow) => {
    if (win) win.webContents.send(AppEvent.updatePin)
  }

  handleAction = (action: Electron.MenuItem | CustomMenuAction, win: ElectronWindow) => {
    if (win && action && 'event' in action) win.webContents.send(action.event, action.args)
  }
}
