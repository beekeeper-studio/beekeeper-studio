import { AppEvent } from "@/common/AppEvent"
import Vue from 'vue'
import { openMenu, MenuItem, DividerItem } from "@beekeeperstudio/ui-kit"
import { IConnection } from "@/common/interfaces/IConnection"
import { isBksInternalColumn } from "@/common/utils"
import store from '@/store'
import TimeAgo from "javascript-time-ago"

export interface ContextOption {
  name: string,
  slug: string
  handler: (...any) => void
  class?: string | ((...args: any[]) => string)
  shortcut?: string
  title?: string | ((...args: any[]) => string)
  /** Material icon name rendered on the trailing edge of the item */
  icon?: string
  /** Disable the item. The handler will not fire and the item appears greyed out. */
  disabled?: boolean
  /** Keep the menu open after this item is clicked */
  keepOpen?: boolean
  /** Child items. When present, this item opens a submenu. */
  items?: ContextOption[]
}

interface MenuProps {
  /** The id of the menu. Not to be confused with the `elementId`. */
  id?: string
  options: (ContextOption | DividerItem)[],
  /** A CSS selector for the element the menu is attached to. @default body */
  elementId?: string
  item: any,
  event: Event
}

function isDivider(option: ContextOption | DividerItem): option is DividerItem {
  return "type" in option && option.type === "divider"
}

/** Convert a studio ContextOption into a UI Kit MenuItem, preserving the legacy
 * `handler({ item, option, event })` call convention. */
function toMenuItem(option: ContextOption): MenuItem {
  return {
    id: option.slug,
    label: option.name,
    class: option.class,
    shortcut: option.shortcut,
    title: option.title,
    icon: option.icon,
    disabled: option.disabled,
    keepOpen: option.keepOpen,
    items: option.items?.map(toMenuItem),
    handler: (event, item) => option.handler({ item, option, event }),
  }
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
    const getExtraPopupMenu = store.getters["popupMenu/getExtraPopupMenu"];
    const extra: (ContextOption | DividerItem)[] = getExtraPopupMenu(args.id) ?? [];
    const options = [...args.options, ...extra].map((option) =>
      isDivider(option) ? option : toMenuItem(option)
    )
    openMenu({
      options,
      item: args.item,
      event: args.event,
      targetElement: args.elementId,
    })
  },
  buildConnectionName(config: IConnection) {
    return config.name || this.simpleConnectionString(config)
  },
  dynamoConnectionLabel(config: IConnection): string {
    const endpoint = config.dynamoDbOptions?.endpoint
    if (endpoint) return endpoint.replace(/^https?:\/\//, '')
    return config.iamAuthOptions?.awsRegion || 'us-east-1'
  },
  buildConnectionString(config: IConnection): string {
    if (config.socketPathEnabled) return config.socketPath;

    if (config.connectionType?.match(/sqlite|libsql|duckdb/)) {
      return config.defaultDatabase || "./unknown.db"
    } else if (config.connectionType === 'mongodb') {
      return config.url
    } else if (config.connectionType === 'dynamodb') {
      return this.dynamoConnectionLabel(config)
    } else if (config.connectionType === 'sqlanywhere' && config.sqlAnywhereOptions.mode === 'file') {
      return config.sqlAnywhereOptions.databaseFile || "./unknown.db"
    } else if (config.connectionType === 'snowflake') {
      return `${config.username || 'user'}@${config.snowflakeOptions?.accountId}/${config.defaultDatabase}`
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
    if (config.connectionType?.match(/sqlite|libsql|duckdb/)) {
      return window.main.basename(config.defaultDatabase || "./unknown.db")
    } else if (config.connectionType === 'cockroachdb' && config.options?.cluster) {
      connectionString = `${config.options.cluster}/${config.defaultDatabase || 'cloud'}`
    } else if (config.connectionType === 'bigquery') {
      connectionString = `${config.bigQueryOptions.projectId}${config.defaultDatabase ? '.' + config.defaultDatabase : ''}`
    } else if (config.connectionType === 'mongodb') {
      return config.url;
    } else if (config.connectionType === 'dynamodb') {
      return this.dynamoConnectionLabel(config)
    } else if (config.connectionType === 'sqlanywhere' && config.sqlAnywhereOptions.mode === 'file') {
      return window.main.basename(config.sqlAnywhereOptions.databaseFile || "./unknown.db")
    } else if (config.connectionType === 'snowflake') {
      connectionString = `${config.snowflakeOptions?.accountId}/${config.defaultDatabase}`;
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
  },
  /** If the bksConfig.security.lockMode is 'pin', calling this will prompt the
  * user for a pin. Otherwise, it will do nothing. */
  async unlock(): Promise<{ auth?: { input: string; mode: 'pin' }, cancelled: boolean }> {
    if (window.bksConfig.security.lockMode === 'pin') {
      return new Promise((resolve) => {
        Vue.prototype.$modal.show('input-pin-modal', {
          onSubmit: (pin: string) => resolve({ auth: { input: pin, mode: 'pin' }, cancelled: false }),
          onCancel: () => resolve({ cancelled: true }),
        })
      })
    }
    return { cancelled: false }
  },
  async promptJwtToken(connectionName?: string): Promise<{ token?: string; cancelled: boolean }> {
    return new Promise((resolve) => {
      const description = connectionName
        ? `Paste a fresh CockroachDB JWT to connect to ${connectionName}. Beekeeper will send it as the password for this connection.`
        : 'Paste a fresh CockroachDB JWT. Beekeeper will send it as the password for this connection.';
      const title = "CockroachDB JWT";

      Vue.prototype.$modal.show('input-ephemeral-modal', {
        description,
        title,
        onSubmit: (token: string) => resolve({ token, cancelled: false }),
        onCancel: () => resolve({ cancelled: true }),
      })
    })
  },
  async promptSnowflakeMFAPasscode(): Promise<{ passcode?: string, cancelled: boolean }> {
    return new Promise((resolve) => {
      const description = "Input the MFA passcode from your Authenticator App";
      const title = "MFA Passcode";

      Vue.prototype.$modal.show('input-ephemeral-modal', {
        description,
        title,
        onSubmit: (passcode: string) => resolve({ passcode, cancelled: false }),
        onCancel: () => resolve({ cancelled: true }),
      });
    })
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
