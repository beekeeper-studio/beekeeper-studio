import Vue from 'vue'
import ContextMenu from './ContextMenuRoot.vue'
import isEmpty from "lodash/isEmpty"

interface BaseMenuItem<Item = unknown> {
  name: string
  handler: (...any) => void
  slug?: string
  class?: string | ((options: { item: Item }) => string)
  shortcut?: string
  ultimate?: boolean
  /** Material Icons name. E.g. 'arrow_drop_down' */
  icon?: string
  disabled?: boolean
  items?: (MenuItem<Item> | Divider)[]
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
export type InternalContextItem = MenuItem & Required<Pick<MenuItem, 'slug'>>;
export type MenuItemsExtension = (event: Event, items: InternalContextItem[], additionalContext?: unknown) => MenuItem[]
export type CustomMenuItems = MenuItem[] | MenuItemsExtension

export function useCustomMenuItems(
  event: Event,
  defaultItems: InternalContextItem[],
  customItems: CustomMenuItems,
  additionalContext?: unknown
): (MenuItem | Divider)[] {
  if (typeof customItems === "function") {
    return customItems(event, defaultItems, additionalContext);
  }
  if (customItems === undefined) {
    return defaultItems;
  }
  return customItems;
}
