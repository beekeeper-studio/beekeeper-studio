import _ from 'lodash'
import { OpenTab } from "@/common/appdb/models/OpenTab";
import { Module } from "vuex";
import { State as RootState } from '../index'
import rawLog from 'electron-log'
import { TransportOpenTab } from '@/common/transport/TransportOpenTab';
import Vue from 'vue';

const log = rawLog.scope('TabModule')

interface State {
  tabs: TransportOpenTab[],
  active?: TransportOpenTab
}


export const TabModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    tabs: [],
    active: undefined
  }),
  getters: {
    sortedTabs(state) {
      return _.sortBy(state.tabs, 'position')
    },
    fatTabs(state, _getters, rootState) {
      return state.tabs.map((tab) => {
        const query = tab.queryId ? rootState['data/queries']['items'].find((q) => q.id === tab.queryId) : null
        const table = tab.tableName ? rootState.tables.find((t) => {
          t.name === tab.tableName && (
            t.schema === tab.schemaName
          )
        }) : null
        return {
          tab,
          query,
          table
        }
      })
    }
  },
  mutations: {
    set(state, tabs: TransportOpenTab[]) {
      state.tabs = tabs
      if (!tabs?.length) {
        state.active = undefined
      }
    },
    add(state, nu: TransportOpenTab) {
      state.tabs.push(nu)
    },
    remove(state, tab: TransportOpenTab) {
      state.tabs = _.without(state.tabs, tab)
    },
    setActive(state, tab?: TransportOpenTab) {
      state.active = tab
    }
  },
  actions: {
    async load(context) {
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        log.info("Loading tabs for ", context.rootState.workspaceId, usedConfig.id)
        const tabs = await Vue.prototype.$util.send('appdb/tabs/find', {
          options: {
            where: {
              connectionId: usedConfig.id,
              workspaceId: context.rootState.workspaceId
            }
          }
        });
        context.commit('set', tabs || [])
        if (tabs?.length) {
          const active = tabs.find((t) => t.active) || tabs[0]
          context.commit('setActive', active)
        }
      }
    },
    async unload(context) {
      await Vue.prototype.$util.send('appdb/tabs/remove', { obj: context.state.tabs })
      context.commit('set', [])
      context.commit('setActive', null)
    },
    async add(context, item: TransportOpenTab) {
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        log.info("saving tab", item)
        item.workspaceId = context.rootState.workspaceId
        item.connectionId = usedConfig.id
        item = await Vue.prototype.$util.send('appdb/tabs/save', { obj: item });
      }
      context.commit('add', item)
    },
    async reorder(context, items: TransportOpenTab[]) {
      items.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', items)
      if (usedConfig?.id) await Vue.prototype.$util.send('appdb/tabs/save', { obj: items });
    },
    async remove(context, rawItems: TransportOpenTab | TransportOpenTab[]) {
      const items = _.isArray(rawItems) ? rawItems : [rawItems]
      items.forEach((i) => context.commit('remove', i))
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        await Vue.prototype.$util.send('appdb/tabs/remove', { obj: items });
      }
    },
    async save(context, rawTabs: TransportOpenTab[] | TransportOpenTab) {
      try {
        const tabs = _.isArray(rawTabs) ? rawTabs : [rawTabs]
        const { usedConfig } = context.rootState
        if (usedConfig?.id) {
          await Vue.prototype.$util.send('appdb/tabs/save', { obj: tabs });
        }
      } catch (ex) {
        console.error("tab/save", ex)
      }
    },
    async saveAll(context) {
      try {
        await context.dispatch('save', context.state.tabs)  
      } catch (ex) {
        console.error("tab/saveAll", ex)
      }
      
    },
    async setActive(context, tab: OpenTab) {
      const oldActive = context.state.active
      context.commit('setActive', tab)
      if (oldActive) {
        oldActive.active = false
      }
      tab.active = true
      await context.dispatch('save', [tab, oldActive].filter((x) => x))

    }

  }
}
