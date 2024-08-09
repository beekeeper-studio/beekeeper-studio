
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { IPlatformInfo } from '../IPlatformInfo'
import { IGroupedUserSettings } from '../transport/TransportUserSetting'
import { menuItems } from './MenuItems'
// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class BaseMenuBuilder {

  app = "Beekeeper Studio"

  constructor(protected settings: IGroupedUserSettings, private actionHandlers: IMenuActionHandler, protected platformInfo: IPlatformInfo) {}

  buildTemplate(): any {
    throw new Error("Must implement buildTemplate for your platform")
  }

  get menuItems(): any {
    return {
      ...menuItems(this.actionHandlers, this.settings, this.platformInfo),
    }
  }

}
