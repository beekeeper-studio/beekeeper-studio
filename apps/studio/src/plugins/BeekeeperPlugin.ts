import { AppEvent } from "@/common/AppEvent"
import Vue from 'vue'
import ContextMenu from '@/components/common/ContextMenu.vue'

export interface ContextOption {
  name: string,
  slug: string
  type?: 'divider'
  handler: (...any) => void
}

interface MenuProps {
  options: ContextOption[],
  elementId: string
  item: any,
  event: Event
}

export const BeekeeperPlugin = {
  closeTab(id?: string) {
    this.$root.$emit(AppEvent.closeTab, id)
  },
  openTableProperties(name: string, schema?: string): boolean {
    const found = this.$store.tables.find((t) => t.name === name && (!schema || schema === t.schema))
    if (found){
      this.$root.$emit('loadTableProperties', { table: found })
      return true
    } else {
      return false
    }
  },
  openMenu(args: MenuProps): void {
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
}

export type BeekeeperPlugin = typeof BeekeeperPlugin


export default {
  install(Vue) {
    Vue.prototype.$app = BeekeeperPlugin
    Vue.prototype.$bks = BeekeeperPlugin
  }
}