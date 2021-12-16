import { AppEvent } from "@/common/AppEvent"
import Vue from 'vue'
import ContextMenu from '@/components/common/ContextMenu.vue'
import { IConnection } from "@/common/interfaces/IConnection"
import path from 'path'

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
  },
  buildConnectionString(config: IConnection): string {
    if (config.connectionType === 'sqlite') {
      return config.defaultDatabase || "./unknown.db"
    } else {
      let result = `${config.username || 'user'}@${config.host}:${config.port}`

      if (config.defaultDatabase) {
        result += `/${config.defaultDatabase}`
      }

      if (config.sshHost) {
        result += ` via ${config.sshUsername}@${config.sshHost}`
        if (config.sshBastionHost) result += ` jump(${config.sshBastionHost})`
      }
      return result
    }
  },
  simpleConnectionString(config: IConnection): string {
    let connectionString = `${config.host}:${config.port}`;
    if (config.connectionType === 'sqlite') {
      return path.basename(config.defaultDatabase || "./unknown.db")
    } else {
      if (config.defaultDatabase) {
        connectionString += `/${config.defaultDatabase}`
      }
      return connectionString
    }
  }
}

export type BeekeeperPlugin = typeof BeekeeperPlugin


export default {
  install(Vue) {
    Vue.prototype.$app = BeekeeperPlugin
    Vue.prototype.$bks = BeekeeperPlugin
  }
}