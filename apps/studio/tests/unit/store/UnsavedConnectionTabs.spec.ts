import Vue from 'vue'
import Vuex from 'vuex'
import { TabModule } from '@/store/modules/TabModule'

Vue.use(Vuex)

const WORKSPACE_ID = -1

// A connection that was never saved has no saved_connection id, so its tabs
// are never persisted and the app db never gives them an id. CoreTabs keys
// everything on `tab.id` (which header is selected, which pane is shown, v-for
// keys, per-tab modals), so id-less tabs all matched the active tab and
// clicking another tab did nothing.

function buildStore(usedConfig: any) {
  return new Vuex.Store({
    state: { usedConfig, workspaceId: WORKSPACE_ID } as any,
    modules: { tabs: TabModule },
  })
}

function queryTab(title: string): any {
  return { tabType: 'query', title, unsavedChanges: false }
}

describe('tabs on a connection that was never saved', () => {
  let store: ReturnType<typeof buildStore>
  let send: jest.Mock

  beforeEach(() => {
    send = jest.fn(async (_channel: string, args: any) => args?.obj)
    Vue.prototype.$util = { send }
    store = buildStore({ id: null, workspaceId: WORKSPACE_ID, connectionType: 'redshift' })
  })

  async function openTabs(...titles: string[]) {
    const tabs = []
    for (const title of titles) {
      tabs.push(await store.dispatch('tabs/add', { item: queryTab(title), endOfPosition: true }))
    }
    return tabs
  }

  it('gives every tab its own id without persisting it', async () => {
    const [first, second] = await openTabs('Query #1', 'Query #2')

    expect(first.id).toEqual(expect.any(Number))
    expect(second.id).toEqual(expect.any(Number))
    expect(first.id).not.toEqual(second.id)
    // can't collide with the id of a persisted tab
    expect(first.id).toBeLessThan(0)
    expect(second.id).toBeLessThan(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('switches the active tab', async () => {
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
    const [, second] = await openTabs('Query #1', 'Query #2')

    store.commit('tabs/replaceTab', { ...second, title: 'Renamed' })

    const titles = (store.state as any).tabs.tabs.map((t) => t.title)
    expect(titles).toEqual(['Query #1', 'Renamed'])
  })
})

describe('tabs on a saved connection', () => {
  it('keep the id the app db assigns', async () => {
    const send = jest.fn(async (channel: string, args: any) =>
      channel === 'appdb/tabs/save' ? { ...args.obj, id: 42 } : args?.obj
    )
    Vue.prototype.$util = { send }
    const store = buildStore({ id: 7, workspaceId: WORKSPACE_ID, connectionType: 'redshift' })

    const tab = await store.dispatch('tabs/add', { item: queryTab('Query #1'), endOfPosition: true })

    expect(send).toHaveBeenCalledWith('appdb/tabs/save', {
      obj: expect.objectContaining({ connectionId: 7 }),
    })
    expect(tab.id).toBe(42)
  })
})
