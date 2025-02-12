import Vue from 'vue'
import ContextMenu from './ContextMenuRoot.vue'
import isEmpty from "lodash/isEmpty"

interface BaseMenuItem<Item = unknown> {
  name: string
  handler: (event: Event, target: Item, option: MenuItem) => void
  slug?: string
  class?: string | ((options: { item: Item }) => string)
  shortcut?: string
  ultimate?: boolean
  /** Material Icons name. E.g. 'arrow_drop_down' */
  icon?: string
  disabled?: boolean
  items?: (MenuItem<Item> | Divider)[]
  /** Set to true or false to make this item a checkbox */
  checked?: boolean
  /** Keep the menu open after this item is clicked */
  keepOpen?: boolean
}

interface DividerItem {
  type: 'divider'
  slug: 'divider'
}

export type MenuItem<Item = unknown> = BaseMenuItem<Item> | DividerItem

export interface Divider {
  type: 'divider'
  slug: 'divider'
}

export interface MenuProps<Item = unknown> {
  options: (MenuItem<Item> | Divider)[],
  /** If set, the menu will be attached to this element. The string must be a valid CSS selector.
   *  @default body */
  targetElement?: string
  item?: Item
  event: Event
}

export const divider: Divider = { type: 'divider', slug: 'divider' }

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

// Context options that are generated internally should have a slug. This will allow the items to be easily located or modified.
export type InternalContextItem<Target> = MenuItem<Target> & Required<Pick<MenuItem<Target>, 'slug'>>;
export type MenuItemsExtension<Target = unknown> = (event: Event, target: Target, defaultItems: InternalContextItem<Target>[]) => MenuItem[]
export type CustomMenuItems = MenuItem[] | MenuItemsExtension

export function useCustomMenuItems<Target>(
  event: Event,
  target: Target,
  defaultItems: InternalContextItem<Target>[],
  customItems: CustomMenuItems,
): (MenuItem | Divider)[] {
  if (typeof customItems === "function") {
    return customItems(event, target, defaultItems);
  }
  if (customItems === undefined) {
    return defaultItems;
  }
  return customItems;
}
