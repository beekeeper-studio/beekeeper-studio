import Vue from 'vue'
import Vuex from 'vuex'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'
import { TabModule } from '@/store/modules/TabModule'
import { sessionConfigFor } from '@/store/anonConnection'

Vue.use(Vuex)

const WORKSPACE_ID = -1

const Handlers = { ...AppDbHandlers, ...TabHistoryHandlers }

// Everything CoreTabs does is keyed on `tab.id`: which header is selected,
// which pane is shown, v-for keys, per-tab modals. A connection that was never
// saved used to have no id, so its tabs were never persisted and never got one
// either - every tab matched the active one, and clicking another tab did
// nothing. Its session now runs on an anonymous saved connection instead.

function buildStore() {
  return new Vuex.Store({
    state: { workspaceId: WORKSPACE_ID, usedConfig: null } as any,
    mutations: {
      // same shape as the root `newConnection` mutation in store/index.ts
      newConnection(state: any, config: any) {
        state.usedConfig = config
      }
    },
    modules: { tabs: TabModule },
  })
}

// What the connection form hands to `connect` when the user fills in a new
// connection and hits Connect without saving.
async function unsavedRedshiftConfig() {
  const fresh = await AppDbHandlers['appdb/saved/new']({ init: null })
  return {
    ...fresh,
    id: null,
    connectionType: 'redshift',
    name: null,
    host: 'example.redshift.amazonaws.com',
    port: 5439,
    username: 'analyst',
    password: 'hunter2',
    defaultDatabase: 'dev',
  }
}

function queryTab(title: string): any {
  return { tabType: 'query', title, unsavedChanges: false }
}

describe('tabs on a connection that was never saved', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(async () => {
    await TestOrmConnection.connect()
    Vue.prototype.$util = {
      send: async (channel: string, args: any) => {
        const handler = (Handlers as any)[channel]
        if (!handler) throw new Error(`No handler for ${channel}`)
        return await handler(args)
      }
    }
    store = buildStore()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  async function connectUnsaved(config: any) {
    const usedConfig = await sessionConfigFor(config)
    store.commit('newConnection', usedConfig)
    await store.dispatch('tabs/load')
    return usedConfig
  }

  async function openTabs(...titles: string[]) {
    const tabs = []
    for (const title of titles) {
      tabs.push(await store.dispatch('tabs/add', { item: queryTab(title), endOfPosition: true }))
    }
    return tabs
  }

  it('runs the session on an anonymous connection of its own', async () => {
    const config = await unsavedRedshiftConfig()

    const usedConfig = await connectUnsaved(config)

    expect(usedConfig.id).toEqual(expect.any(Number))
    expect(usedConfig.anon).toBe(true)
    expect(usedConfig.workspaceId).toBe(WORKSPACE_ID)
    // the session still connects with everything the user typed in...
    expect(usedConfig.password).toBe('hunter2')
    // ...but the connection form's own config stays unsaved
    expect(config.id).toBeNull()
    expect(config.anon).toBeFalsy()
  })

  it('gives every tab its own id', async () => {
    await connectUnsaved(await unsavedRedshiftConfig())

    const [first, second] = await openTabs('Query #1', 'Query #2')

    expect(first.id).toEqual(expect.any(Number))
    expect(second.id).toEqual(expect.any(Number))
    expect(first.id).not.toEqual(second.id)
  })

  it('switches the active tab', async () => {
    await connectUnsaved(await unsavedRedshiftConfig())
    const [first, second] = await openTabs('Query #1', 'Query #2')
    await store.dispatch('tabs/setActive', first)

    await store.dispatch('tabs/setActive', second)

    const { tabs, active } = (store.state as any).tabs
    // how CoreTabs decides which header is selected and which pane is shown
    const shown = tabs.filter((t) => active?.id === t.id)
    expect(shown.map((t) => t.title)).toEqual(['Query #2'])
    expect(tabs.filter((t) => t.active).map((t) => t.title)).toEqual(['Query #2'])
  })

  it('replaces only the tab it was given', async () => {
    await connectUnsaved(await unsavedRedshiftConfig())
    const [, second] = await openTabs('Query #1', 'Query #2')

    store.commit('tabs/replaceTab', { ...second, title: 'Renamed' })

    const titles = (store.state as any).tabs.tabs.map((t) => t.title)
    expect(titles).toEqual(['Query #1', 'Renamed'])
  })

  it('never shows the anonymous connection as a saved one', async () => {
    const usedConfig = await connectUnsaved(await unsavedRedshiftConfig())

    const listed = await AppDbHandlers['appdb/saved/find']({ options: {} })

    expect(listed.map((c) => c.id)).not.toContain(usedConfig.id)
    expect(await SavedConnection.findOneBy({ id: usedConfig.id })).toBeTruthy()
  })
})
