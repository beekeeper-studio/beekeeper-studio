import _ from 'lodash'
import { Module } from "vuex";
import { State as RootState } from '../index'
import rawLog from '@bksLogger'
import { TransportOpenTab, duplicate, matches } from '@/common/transport/TransportOpenTab';
import Vue from 'vue';

const log = rawLog.scope('TabModule')

interface State {
  tabs: TransportOpenTab[],
  active?: TransportOpenTab,
  lastClosedTabs: TransportOpenTab[]
}


export const TabModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    tabs: [],
    active: undefined,
    lastClosedTabs: [],
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

      // Prevent multiple tabs per table
      const existingTabInClosedTabs = state.lastClosedTabs.find((tab) => matches(tab, nu))
      if (existingTabInClosedTabs) {
        state.lastClosedTabs = _.without(state.lastClosedTabs, existingTabInClosedTabs)
      }
    },
    remove(state, tabs: TransportOpenTab | TransportOpenTab[]) {
      if (!_.isArray(tabs)) tabs = [tabs]
      state.tabs = _.without(state.tabs, ...tabs)
      state.lastClosedTabs.push(...tabs.map((tab) => duplicate(tab)))
    },
    setActive(state, tab?: TransportOpenTab) {
      state.active = tab
    },
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
      context.commit('remove', context.state.tabs)
      context.commit('setActive', null)
    },
    async reopenLastClosedTab(context) {
      // Walk through array in reverse to check if it belongs to the current connection
      for (let i = context.state.lastClosedTabs.length - 1; i >= 0; i--) {
        const tab = context.state.lastClosedTabs[i]
        // Does this tab belong to the current connection?
        if (tab.connectionId === context.rootState.usedConfig?.id && tab.workspaceId === context.rootState.workspaceId) {
          await context.dispatch('add', { item: tab })
          await context.dispatch('setActive', tab)
          break
        }
      }
    },
    async add(context, options: { item: TransportOpenTab, endOfPosition?: boolean }) {
      const { usedConfig } = context.rootState
      let { item, endOfPosition } = options
      if (endOfPosition) {
        item.position = (context.getters.sortedTabs.reverse()[0]?.position || 0) + 1
      }
      if (usedConfig?.id) {
        log.info("saving tab", item)
        item.workspaceId = context.rootState.workspaceId
        item.connectionId = usedConfig.id
        item = await Vue.prototype.$util.send('appdb/tabs/save', { obj: item });
      }
      context.commit('add', item)
      return item;
    },
    async reorder(context, items: TransportOpenTab[]) {
      items.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', items)
      if (usedConfig?.id) await Vue.prototype.$util.send('appdb/tabs/save', { obj: items });
    },
    async remove(context, rawItems: TransportOpenTab | TransportOpenTab[]) {
      const items = _.isArray(rawItems) ? rawItems : [rawItems]
      items.forEach((tab) => context.commit('remove', tab))
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
    async setActive(context, tab: TransportOpenTab) {
      const oldActive = context.state.active
      context.commit('setActive', tab)
      if (oldActive) {
        oldActive.active = false
      }
      tab.active = true
      await context.dispatch('save', [tab, oldActive].filter((x) => !!x))

    }

  }
}
