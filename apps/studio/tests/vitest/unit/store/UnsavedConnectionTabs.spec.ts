import { describe, it, expect, beforeEach } from 'vitest'
import Vue from 'vue'
import Vuex from 'vuex'
import { TabModule } from '@/store/modules/TabModule'
import { TransportOpenTab } from '@/common/transport/TransportOpenTab'

Vue.use(Vuex)

// Everything CoreTabs does is keyed on `tab.id`: which header is selected,
// which pane is shown, v-for keys, per-tab modals. Only a session on a saved
// connection persists its tabs, and only the database hands out ids, so on a
// connection that was never saved every tab used to have no id at all: they
// all matched the active tab, and clicking another tab did nothing. A tab
// that isn't persisted now takes a transient id of its own instead.

const WORKSPACE_ID = -1

// What the connection form hands to `connect` when the user fills in a new
// connection and hits Connect without saving: a config with no id.
const UNSAVED_CONFIG = { id: null, name: null, connectionType: 'postgresql', workspaceId: WORKSPACE_ID }
const SAVED_CONFIG = { id: 3, name: 'Prod', connectionType: 'postgresql', workspaceId: WORKSPACE_ID }

// the tab module reads the session's connection off the root state
function buildStore(usedConfig: any) {
  return new Vuex.Store<any>({
    state: { workspaceId: WORKSPACE_ID, usedConfig },
    modules: { tabs: TabModule },
  })
}

// what CoreTabs.createQuery hands to tabs/add
function newTab(title: string): TransportOpenTab {
  return { tabType: 'query', title, unsavedChanges: false } as TransportOpenTab
}

let sent: { channel: string; args: any }[]

beforeEach(() => {
  sent = []
  let nextDatabaseId = 42
  Vue.prototype.$util = {
    send: async (channel: string, args: any) => {
      sent.push({ channel, args })
      // the database hands a saved tab its id
      if (channel === 'appdb/tabs/save' && !Array.isArray(args.obj)) {
        return { ...args.obj, id: args.obj.id ?? nextDatabaseId++ }
      }
      return args?.obj
    },
  }
})

describe('tabs on a connection that was never saved', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(() => {
    store = buildStore(UNSAVED_CONFIG)
  })

  async function open(title: string): Promise<TransportOpenTab> {
    return await store.dispatch('tabs/add', { item: newTab(title), endOfPosition: true })
  }

  it('gives every tab an id of its own', async () => {
    const tabs = [await open('Query #1'), await open('Query #2'), await open('Shell #1')]

    const ids = tabs.map((t) => t.id)
    ids.forEach((id) => expect(id).toEqual(expect.any(Number)))
    expect(new Set(ids).size).toBe(3)
  })

  it('never hands out an id a saved tab could have', async () => {
    const tab = await open('Query #1')

    // database ids are positive
    expect(tab.id).toBeLessThan(0)
  })

  it('selects only the clicked tab', async () => {
    const first = await open('Query #1')
    const second = await open('Query #2')
    await store.dispatch('tabs/setActive', first)

    await store.dispatch('tabs/setActive', second)

    const { tabs, active } = store.state.tabs
    // how CoreTabs decides which header is selected and which pane is shown
    expect(tabs.filter((t) => active?.id === t.id).map((t) => t.title)).toEqual(['Query #2'])
    expect(tabs.filter((t) => t.active).map((t) => t.title)).toEqual(['Query #2'])
  })

  it('replaces only the tab it is handed', async () => {
    await open('Query #1')
    const second = await open('Query #2')

    store.commit('tabs/replaceTab', { ...second, title: 'Renamed' })

    expect(store.state.tabs.tabs.map((t) => t.title)).toEqual(['Query #1', 'Renamed'])
  })

  it('never persists them', async () => {
    const first = await open('Query #1')
    const second = await open('Query #2')
    await store.dispatch('tabs/setActive', second)
    await store.dispatch('tabs/reorder', [second, first])
    await store.dispatch('tabs/save', second)
    await store.dispatch('tabs/remove', first)

    expect(sent.map((s) => s.channel).filter((c) => c.startsWith('appdb/tabs'))).toEqual([])
  })

  it('does not reuse an id once the tabs are cleared', async () => {
    const before = await open('Query #1')
    // what CoreInterface does on disconnect
    store.commit('tabs/set', [])

    const after = await open('Query #1')

    expect(after.id).not.toBe(before.id)
  })
})

describe('tabs on a saved connection', () => {
  it('take the id the database hands out', async () => {
    const store = buildStore(SAVED_CONFIG)

    const tab = await store.dispatch('tabs/add', { item: newTab('Query #1'), endOfPosition: true })

    expect(tab.id).toBe(42)
    expect(sent).toEqual([{
      channel: 'appdb/tabs/save',
      args: { obj: expect.objectContaining({ title: 'Query #1', connectionId: 3, workspaceId: WORKSPACE_ID }) },
    }])
  })
})
