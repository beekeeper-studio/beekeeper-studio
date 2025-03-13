import { AppEvent } from "@/common/AppEvent"
import Vue from 'vue'
import ContextMenu from '@/components/common/ContextMenu.vue'
import { IConnection } from "@/common/interfaces/IConnection"
import { isBksInternalColumn } from "@/common/utils"
import store from '@/store'
import TimeAgo from "javascript-time-ago"

export interface ContextOption {
  name: string,
  slug: string
  type?: 'divider'
  handler: (...any) => void
  class?: string
  shortcut?: string
  ultimate?: boolean
}

interface MenuProps {
  options: ContextOption[],
  elementId?: string
  item: any,
  event: Event
}

export const BeekeeperPlugin = {
  timeAgo(date: Date) {
    if (date > new Date('2888-01-01')) {
      return 'forever'
    }
    const ta = new TimeAgo('en-US')

    return ta.format(date)

  },
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
      store,
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

    if (config.connectionType.match(/sqlite|libsql|duckdb/)) {
      return config.defaultDatabase || "./unknown.db"
    } else if (config.connectionType === 'mongodb') {
      return config.url
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
    if (config.connectionType.match(/sqlite|libsql|duckdb/)) {
      return window.main.basename(config.defaultDatabase || "./unknown.db")
    } else if (config.connectionType === 'cockroachdb' && config.options?.cluster) {
      connectionString = `${config.options.cluster}/${config.defaultDatabase || 'cloud'}`
    } else if (config.connectionType === 'bigquery') {
      connectionString = `${config.bigQueryOptions.projectId}${config.defaultDatabase ? '.' + config.defaultDatabase : ''}`
    } else if (config.connectionType === 'mongodb') {
      return config.url;
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
      if (!isBksInternalColumn(key)) {
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

    Vue.prototype.$confirm = function(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean> {
      return new Promise<boolean>((resolve, reject) => {
        try {
          this.trigger(AppEvent.createConfirmModal, {
            title,
            message,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
            ...options,
          })
        } catch (e) {
          reject(e)
        }
      })
    }

    Vue.prototype.$confirmById = function(id: string): Promise<boolean> {
      return new Promise<boolean>((resolve, reject) => {
        try {
          this.trigger(AppEvent.showConfirmModal, {
            id,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          })
        } catch (e) {
          reject(e)
        }
      })
    }

  }
}
