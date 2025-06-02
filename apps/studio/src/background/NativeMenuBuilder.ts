import MenuBuilder from '../common/menus/MenuBuilder'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'
import { ipcMain, BrowserWindow } from 'electron'
import {AppEvent} from '../common/AppEvent'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import platformInfo from '@/common/platform_info'

const log = rawLog.scope('NativeMenuBuilder')

export default class NativeMenuBuilder {
  private builder?: MenuBuilder
  private handler: NativeMenuActionHandlers
  private menu?: Electron.Menu

  constructor(private electron: any, settings: IGroupedUserSettings){
    this.handler = new NativeMenuActionHandlers(settings)
    // We only support native titlebars for Mac now
    if (platformInfo.isMac) {
      this.builder = new MenuBuilder(settings, this.handler, platformInfo)
    }
  }

  initialize(): void {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
    }
    this.listenForClicks()
    this.listenForToggleConnectionMenuItems();
  }

  toggleConnectionMenuItems(action:"enable"|"disable") {
      if(!this.menu){
        return;
      }

      const isEnabled = action === "enable" ? true : false;

      const getMenuItems = (label: string) => this.menu?.items.find(item => item.label === label)?.submenu?.items ?? [];

      const toggleMenuMap = {
        File: ["new-query-menu", "go-to", "disconnect", "import-sql-files", "close-tab"],
        View: ["menu-toggle-sidebar", "menu-secondary-sidebar"],
        Tools: ["backup-database", "restore-database", "export-tables"]
      };

      for(const [menuLabel, toggleMenuIds] of Object.entries(toggleMenuMap)){
        const menuItems = getMenuItems(menuLabel);
        menuItems.forEach(menuItem=>{
          if(toggleMenuIds.includes(menuItem.id)){
            menuItem.enabled = isEnabled;
          }
        })
      }
  }

  listenForClicks(): void {
    ipcMain.on(AppEvent.menuClick, (event, actionName: keyof NativeMenuActionHandlers, arg) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        log.debug("Received Menu Click, event", actionName, arg, window)
        if (window) {
          const func = this.handler[actionName].bind(this.handler)
          func(arg ?? null, window)
        }
      } catch (e) {
        console.error(`Couldn't trigger action ${actionName}(${arg || ""}), ${e.message}`)
      }
    })
  }

  listenForToggleConnectionMenuItems(): void {
    ipcMain.on("enable-connection-menu-items", (_event ) => this.toggleConnectionMenuItems("enable"));
    ipcMain.on("disable-connection-menu-items", (_event ) => this.toggleConnectionMenuItems("disable"));
  }
}
