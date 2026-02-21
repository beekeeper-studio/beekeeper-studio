import MenuBuilder from '../common/menus/MenuBuilder'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'
import { ipcMain, BrowserWindow, MenuItemConstructorOptions } from 'electron'
import {AppEvent} from '../common/AppEvent'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import platformInfo from '@/common/platform_info'
import { NativePluginMenuItem } from '@/services/plugin/types'
import _ from 'lodash'

const log = rawLog.scope('NativeMenuBuilder')

export default class NativeMenuBuilder {
  private builder?: MenuBuilder
  private handler: NativeMenuActionHandlers
  private menu?: Electron.Menu
  /** Array of native menu items from plugins */
  private pluginMenuItems: MenuItemConstructorOptions[] = []

  constructor(private electron: any, settings: IGroupedUserSettings, bksConfig: IBksConfig){
    this.handler = new NativeMenuActionHandlers(settings)
    // We only support native titlebars for Mac now
    if (platformInfo.isMac) {
      this.builder = new MenuBuilder(settings, this.handler, platformInfo, bksConfig)
    }
  }

  initialize(): void {
    if (this.builder) {
      this.rebuildMenu()
    } else {
      this.electron.Menu.setApplicationMenu(null)
    }
    this.listenForClicks()
    this.listenForToggleConnectionMenuItems();
    this.listenForPluginMenuChanges();
  }

  toggleConnectionMenuItems(action:"enable"|"disable") {
      if(!this.menu){
        return;
      }

      const isEnabled = action === "enable" ? true : false;

      const getMenuItems = (label: string) => this.menu?.items.find(item => item.label === label)?.submenu?.items ?? [];

      const pluginItemIds = this.pluginMenuItems.map((item) => item.id);

      const toggleMenuMap = {
        File: ["new-query-menu", "go-to", "disconnect", "import-sql-files", "close-tab"],
        View: ["menu-toggle-sidebar", "menu-secondary-sidebar"],
        Tools: ["backup-database", "restore-database", "export-tables", ...pluginItemIds],
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

  listenForPluginMenuChanges(): void {
    ipcMain.on("add-native-menu-item", (_event, item: NativePluginMenuItem) => {
      this.pluginMenuItems.push({
        ...item,
        click: (_menuItem, win) => {
          if (win && win instanceof BrowserWindow) {
            win.webContents.send(AppEvent.pluginMenuClicked, item);
          }
        },
      });
      this.rebuildMenu();
    });

    ipcMain.on("remove-native-menu-item", (_event, id: string) => {
      const removed = _.remove(this.pluginMenuItems, item => item.id === id);
      if (removed.length) {
        this.rebuildMenu();
      }
    });
  }

  private rebuildMenu(): void {
    if (!this.builder) {
      return;
    }
    const template = this.builder.buildTemplate();
    this.injectPluginMenuItems(template);
    this.menu = this.electron.Menu.buildFromTemplate(template);
    this.electron.Menu.setApplicationMenu(this.menu);
  }

  private injectPluginMenuItems(template: Electron.MenuItemConstructorOptions[]): void {
    // Plugin menu items always go under Tools menu
    const toolsMenu = template.find(m => m.label === 'Tools' || m.id === 'tools');
    if (!toolsMenu || !Array.isArray(toolsMenu.submenu)) {
      return;
    }
    toolsMenu.submenu.push(...this.pluginMenuItems);
  }
}
