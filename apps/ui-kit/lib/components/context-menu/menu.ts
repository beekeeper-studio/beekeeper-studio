import Vue from 'vue'
import ContextMenu from './ContextMenu.vue'

export interface ContextOption<Item = unknown> {
  name: string
  handler: (...any) => void
  slug?: string
  type?: 'divider'
  class?: string | ((options: { item: Item }) => string)
  shortcut?: string
  ultimate?: boolean
  /** Material Icons name. E.g. 'arrow_drop_down' */
  icon?: string
}

export interface MenuProps<Item = unknown> {
  options: ContextOption<Item>[],
  /** If set, the menu will be attached to this element. The string must be a valid CSS selector.
   *  @default body */
  targetElement?: string
  item: Item
  event: Event
}

export function openMenu(args: MenuProps) {
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

