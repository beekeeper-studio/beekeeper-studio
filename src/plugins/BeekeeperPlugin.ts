import Vue from 'vue'
import { Store } from 'vuex'

interface OpenRecordOptions {
  table: string
  schema?: string
  pkColumn: string
  pkValue: any
}

export class BeekeeperPlugin {
  private store: Store<any>
  constructor(store: Store<any>) {
    this.store = store
  }

  openRecord($root: Vue, options: OpenRecordOptions): boolean {
    const filter = {
      value: options.pkValue, type: '=', field: options.pkColumn
    }

    const table = this.store.getters.tableFor(options.table, options.schema)
    if (!table) return false

    const payload = {
      filter,
      table: table,
      titleScope: options.pkValue
    }
    console.log('opening table with', payload)
    $root.$emit('loadTable', payload)
    return true
  }
}


export const VueBeekeeperPlugin = {
  install(Vue: { new(): Vue }, store: Store<any>): void {
    Vue.prototype.$bks = new BeekeeperPlugin(store)
  }
}
