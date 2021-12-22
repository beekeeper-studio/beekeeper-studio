import _ from 'lodash'
import { OpenTab } from "@/common/appdb/models/OpenTab";
import { Module } from "vuex";
import { State as RootState } from '../index'
import rawLog from 'electron-log'

const log = rawLog.scope('TabModule')

interface State {
  tabs: OpenTab[],
  active?: OpenTab
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
    set(state, tabs: OpenTab[]) {
      state.tabs = tabs
      if (!tabs?.length) {
        state.active = undefined
      }
    },
    add(state, nu: OpenTab) {
      state.tabs.push(nu)
    },
    remove(state, tab: OpenTab) {
      state.tabs = _.without(state.tabs, tab)
    },
    setActive(state, tab?: OpenTab) {
      state.active = tab
    }
  },
  actions: {
    async load(context) {
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        log.info("Loading tabs for ", context.rootState.workspaceId, usedConfig.id)
        const tabs = await OpenTab.find({
          where: {
            connectionId: usedConfig.id,
            workspaceId: context.rootState.workspaceId
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
      await OpenTab.remove(context.state.tabs)
      context.commit('set', [])
      context.commit('setActive', null)
    },
    async add(context, item: OpenTab) {
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        log.info("saving tab", item)
        item.workspaceId = context.rootState.workspaceId
        item.connectionId = usedConfig.id
        await item.save()
      }
      context.commit('add', item)
    },
    async reorder(context, items: OpenTab[]) {
      items.forEach((p, idx) => p.position = idx)
      const { usedConfig } = context.rootState
      context.commit('set', items)
      if (usedConfig?.id) await OpenTab.save(items)
    },
    async remove(context, rawItems: OpenTab | OpenTab[]) {
      const items = _.isArray(rawItems) ? rawItems : [rawItems]
      items.forEach((i) => context.commit('remove', i))
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        await OpenTab.remove(items)
      }
    },
    async save(context, rawTabs: OpenTab[] | OpenTab) {
      const tabs = _.isArray(rawTabs) ? rawTabs : [rawTabs]
      const { usedConfig } = context.rootState
      if (usedConfig?.id) {
        await OpenTab.save(tabs)
      }
    },
    async saveAll(context) {
      await context.dispatch('save', context.state.tabs)
    },
    async setActive(context, tab: OpenTab) {
      const oldActive = context.state.active
      context.commit('setActive', tab)
      if (oldActive) {
        oldActive.active = false
      }
      tab.active = true
      await context.dispatch('save', [tab, oldActive])

    }

  }
}