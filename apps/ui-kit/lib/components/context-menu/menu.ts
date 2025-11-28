import Vue from 'vue'
import ContextMenu from './ContextMenuRoot.vue'
import isEmpty from "lodash/isEmpty"

export interface BaseMenuItem<Item = unknown> {
  label: string | { html: string }
  handler: (event: Event, target: Item, menuItem: MenuItem) => void
  id?: string
  class?: string | ((options: { item: Item }) => string)
  shortcut?: string | string[]
  disabled?: boolean
  items?: (MenuItem<Item> | DividerItem)[]
  /** Keep the menu open after this item is clicked */
  keepOpen?: boolean
}

export interface CheckedMenuItem<Item = unknown> extends BaseMenuItem<Item> {
  /** Set to true or false to make this item a checkbox */
  checked: boolean
  id: string
}

export interface DividerItem {
  type: 'divider'
  id: 'divider'
}

export type MenuItem<Item = unknown> = BaseMenuItem<Item> | CheckedMenuItem<Item> |  DividerItem

export interface MenuProps<Item = unknown> {
  options: MenuItem<Item>[],
  /** If set, the menu will be attached to this element. The string must be a valid CSS selector.
   *  @default body */
  targetElement?: string
  item?: Item
  event: Event
}

export const divider: DividerItem = { type: 'divider', id: 'divider' }

export function openMenu<Item>(args: MenuProps<Item>) {
  if (isEmpty(args.options)) return
  const ContextComponent = Vue.extend(ContextMenu)
  const cMenu = new ContextComponent({
    propsData: args
  })
  cMenu.$on('close', () => {
    cMenu.$off()
    cMenu.$destroy()
  })
  cMenu.$mount()
}

// Context options that are generated internally should have a id. This will allow the items to be easily located or modified.
export type InternalContextItem<Target> = MenuItem<Target> & Required<Pick<MenuItem<Target>, 'id'>>;
export type MenuItemsExtension<Target = unknown> = (event: Event, target: Target, defaultItems: InternalContextItem<Target>[]) => MenuItem[]
export type CustomMenuItems = MenuItem[] | MenuItemsExtension
export type ContextMenuExtension<Context = unknown> = (event: Event, defaultItems: InternalContextItem<Context>[], context: Context) => { items: InternalContextItem<Context>[]; context: Context };

export function useCustomMenuItems<Target>(
  event: Event,
  target: Target,
  defaultItems: InternalContextItem<Target>[],
  customItems: CustomMenuItems,
): (MenuItem | DividerItem)[] {
  if (typeof customItems === "function") {
    return customItems(event, target, defaultItems);
  }
  if (customItems === undefined) {
    return defaultItems;
  }
  return customItems;
}
