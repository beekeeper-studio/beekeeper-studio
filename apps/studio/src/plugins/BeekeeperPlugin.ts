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
  buildConnectionName(config: IConnection) {
    return config.name || this.simpleConnectionString(config)
  },
  buildConnectionString(config: IConnection): string {
    if (config.socketPathEnabled) return config.socketPath;

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
    if (config.socketPathEnabled) return config.socketPath;

    let connectionString = `${config.host}:${config.port}`;
    if (config.connectionType === 'sqlite') {
      return path.basename(config.defaultDatabase || "./unknown.db")
    } else if (config.connectionType === 'cockroachdb' && config.options?.cluster) {
      connectionString = `${config.options.cluster}/${config.defaultDatabase || 'cloud'}`
    } else {
      if (config.defaultDatabase) {
        connectionString += `/${config.defaultDatabase}`
      }
    }
    return connectionString
  },

  cleanData(data: any, columns: {title: string, field: string}[] = []) {
    const fixed = {}
    Object.keys(data).forEach((key) => {
      const v = data[key]
      // internal table fields used just for us
      if (!key.endsWith('--bks')) {
        const column = columns.find((c) => c.field === key)
        const nuKey = column ? column.title : key
        fixed[nuKey] = v
      }
    })
    return fixed
  }
}

export type BeekeeperPlugin = typeof BeekeeperPlugin


export default {
  install(Vue) {
    Vue.prototype.$app = BeekeeperPlugin
    Vue.prototype.$bks = BeekeeperPlugin
  }
}
