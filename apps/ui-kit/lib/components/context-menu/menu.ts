import Vue from 'vue'
import ContextMenu from './ContextMenu.vue'
import isEmpty from "lodash/isEmpty"

export interface ContextOption<Item = unknown> {
  name: string
  handler: (...any) => void
  slug?: string
  class?: string | ((options: { item: Item }) => string)
  shortcut?: string
  ultimate?: boolean
  /** Material Icons name. E.g. 'arrow_drop_down' */
  icon?: string
}

export interface Divider {
  type: 'divider'
  slug: 'divider'
}

export interface MenuProps<Item = unknown> {
  options: (ContextOption<Item> | Divider)[],
  /** If set, the menu will be attached to this element. The string must be a valid CSS selector.
   *  @default body */
  targetElement?: string
  item?: Item
  event: Event
}

// Context options that are generated internally should have a slug. This will allow the items to be easily located or modified.
export type InternalContextOption<Item = unknown> = ContextOption<Item> & Required<Pick<ContextOption, 'slug'>>;

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

type CustomMenuItems = ContextOption[] | ((event: Event, items: InternalContextOption[]) => ContextOption[])

export function useCustomMenuItems(
  event: Event,
  defaultItems: (InternalContextOption | Divider)[],
  customItems: CustomMenuItems
): (ContextOption | Divider)[] {
  if (typeof customItems === "function") {
    return customItems(event, defaultItems as InternalContextOption[]);
  }
  if (customItems === undefined) {
    return defaultItems;
  }
  return customItems;
}
