import _ from 'lodash'
import { Module } from "vuex";
import { State as RootState } from '../index'
import rawLog from '@bksLogger'
import { TransportOpenTab, duplicate, matches, TabTypeConfig } from '@/common/transport/TransportOpenTab';
import Vue from 'vue';

const log = rawLog.scope('TabModule')

interface State {
  tabs: TransportOpenTab[],
  active?: TransportOpenTab,
  lastClosedTabs: TransportOpenTab[]
  /** All tab type configurations available. */
  allTabTypeConfigs: TabTypeConfig.Config[];
}


export const TabModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    tabs: [],
    active: undefined,
    lastClosedTabs: [],
    allTabTypeConfigs: [
      {
        type: 'query',
        name: "Query",
        menuItem: { label: 'Add Query', shortcut: 'Control+T' },
      },
      {
        type: 'shell',
        name: "Shell",
        menuItem: { label: 'Add Shell' },
      },
    ],
  }),
  getters: {
    tabTypeConfigs(state, _getters, _rootState, rootGetters) {
      return state.allTabTypeConfigs.filter((tab) => {
        if (tab.type === "shell" && rootGetters.dialectData?.disabledFeatures?.shell) {
          return false;
        }
        if (tab.type === "plugin-shell" || tab.type === "plugin-base") {
          return !window.bksConfig.get(`plugins.${tab.pluginId}.disabled`);
        }
        return true;
      })
    },
    newTabDropdownItems(_state, getters) {
      const items = [];
      for (const config of getters.tabTypeConfigs) {
        if (!config.menuItem) continue;
        items.push({ ...config.menuItem, config });
      }
      return items;
    },
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
      const tabs = state.tabs.map(t => {
        t.active = t.id === tab.id
        return t
      })
      state.active = tab
      state.tabs = tabs
    },

    addTabTypeConfig(state, newConfig: TabTypeConfig.PluginConfig) {
      const found = state.allTabTypeConfigs.find((t: TabTypeConfig.PluginConfig) =>
        t.pluginId === newConfig.pluginId && t.pluginTabTypeId === newConfig.pluginTabTypeId
      )
      if (!found) {
        state.allTabTypeConfigs.push(newConfig)
      } else if (newConfig.menuItem) {
        // If tabTypeConfig already exists, update the menuItem
        Vue.set(found, 'menuItem', newConfig.menuItem)
      }
    },

    removeTabTypeConfig(state, config: TabTypeConfig.PluginConfig) {
      state.allTabTypeConfigs = state.allTabTypeConfigs.filter((t: TabTypeConfig.PluginConfig) => {
        if (t.type !== "plugin-shell" && t.type !== "plugin-base") {
          return true;
        }
        const matches = t.pluginId === config.pluginId && t.pluginTabTypeId === config.pluginTabTypeId
        return !matches;
      })
    },

    setMenuItem(state, newConfig: TabTypeConfig.PluginRef & { menuItem: TabTypeConfig.PluginConfig['menuItem'] }) {
      const found = state.allTabTypeConfigs.find((t: TabTypeConfig.PluginConfig) =>
        t.pluginId === newConfig.pluginId && t.pluginTabTypeId === newConfig.pluginTabTypeId
      )
      if (!found) {
        throw new Error(`Plugin ${newConfig.pluginId} does not exist`)
      }
      found.menuItem = newConfig.menuItem
    },

    unsetMenuItem(state, config: TabTypeConfig.PluginRef) {
      const found = state.allTabTypeConfigs.find((t: TabTypeConfig.PluginConfig) =>
        t.pluginId === config.pluginId && t.pluginTabTypeId === config.pluginTabTypeId
      )
      if (!found) {
        throw new Error(`Plugin ${config.pluginId} does not exist`)
      }
      found.menuItem = undefined
    },
    replaceTab(state, tab: TransportOpenTab) {
      const index = state.tabs.findIndex((t) => t.id === tab.id);
      if (index !== -1) {
        Vue.set(state.tabs, index, tab);
      }
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
        })
        context.commit('set', tabs || [])
        if (tabs?.length) {
          const active = tabs.find((t) => t.active) || tabs[0]
          context.commit('setActive', active)
        }
      }
    },
    async unload(context) {
      await context.dispatch('remove', context.state.tabs)
      context.commit('setActive', null)
    },
    async reopenLastClosedTab(context) {
      const { usedConfig, workspaceId } = context.rootState

      try {
        const tab = await Vue.prototype.$util.send('appdb/tabhistory/getLastDeletedTab', { workspaceId: workspaceId, connectionId: usedConfig.id });
        if (tab) {
          tab.deletedAt = null
          await context.dispatch('add', { item: tab })
          await context.dispatch('setActive', tab)
        }
      }catch (err) {
        console.error(err)
      }
    },
    async add(context, options: { item: TransportOpenTab, endOfPosition?: boolean }) {
      const { usedConfig } = context.rootState
      const { endOfPosition } = options
      let { item } = options

      if (endOfPosition) {
        item.position = (context.getters.sortedTabs.reverse()[0]?.position || 0) + 1
      }
      if (usedConfig?.id) {
        log.info("saving tab", item)
        item.workspaceId = context.rootState.workspaceId
        item.connectionId = usedConfig.id
        item.deletedAt = null
        item.active = true
        item = await Vue.prototype.$util.send('appdb/tabs/save', { obj: item })
      }
      context.commit('add', item)
      return item;
    },
    async reorder(context, items: TransportOpenTab[]) {
      items.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', items)
      if (usedConfig?.id) await Vue.prototype.$util.send('appdb/tabs/save', { obj: items })
    },
    async remove(context, rawItems: TransportOpenTab | TransportOpenTab[]) {
      const items = _.isArray(rawItems) ? rawItems : [rawItems]
      items.forEach((tab) => {
        tab.deletedAt = new Date()
        tab.position = 99
        context.commit('remove', tab)
      })
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        await Vue.prototype.$util.send('appdb/tabs/save', { obj: items })
      }
    },
    async save(context, rawTabs: TransportOpenTab[] | TransportOpenTab) {
      try {
        if (rawTabs == null) return
        const tabs = _.isArray(rawTabs) ? rawTabs : [rawTabs]
        const { usedConfig } = context.rootState
        if (usedConfig?.id) {
          await Vue.prototype.$util.send('appdb/tabs/save', { obj: tabs })
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
      tab.lastActive = new Date()
      tab.deletedAt = null

      await context.dispatch('save', [tab, oldActive].filter((x) => !!x))
    }

  }
}
