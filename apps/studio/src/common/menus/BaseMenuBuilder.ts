
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { IGroupedUserSettings } from '../appdb/models/user_setting'
import { menuItems } from './MenuItems'
// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class BaseMenuBuilder {

  app = "Beekeeper Studio"

  constructor(private settings: IGroupedUserSettings, private actionHandlers: IMenuActionHandler) {}

  buildTemplate() {
    throw new Error("Must implement buildTemplate for your platform")
  }

  get menuItems() {
    return {
      ...menuItems(this.actionHandlers, this.settings),
    }
  }

}
