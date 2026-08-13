import Vue from 'vue'
import store from '@/store'

// The connect action talks to the utility process via `$util.send` and to the
// main process via `window.main`. Both are stubbed so the action's own
// sequencing - what it commits, in what order, and what it tears down on
// failure - is what's under test.
const sent: string[] = []
let sendImpl: (channel: string, args?: any) => Promise<any>

function stubConnectionClient(overrides: Record<string, any> = {}) {
  Object.assign(store.state.connection, {
    defaultSchema: async () => 'public',
    supportedFeatures: async () => ({ backups: false, customRoutines: false }),
    versionString: async () => '1.0.0',
    listDatabases: async () => ['mydb'],
    listTables: async () => [],
    listViews: async () => [],
    listMaterializedViews: async () => [],
    listRoutines: async () => [],
    listSchemas: async () => [],
    ...overrides,
  })
}

const CONFIG: any = { connectionType: 'sqlite', defaultDatabase: '/tmp/x.db', workspaceId: -1, id: 1 }

describe('store connect action', () => {
  beforeEach(() => {
    sent.length = 0
    sendImpl = async () => undefined

    Vue.prototype.$util = {
      send: (channel: string, args?: any) => {
        sent.push(channel)
        return sendImpl(channel, args)
      }
    }

    // @ts-expect-error - test stub for the preload bridge
    window.main = {
      enableConnectionMenuItems: jest.fn(),
      disableConnectionMenuItems: jest.fn(),
      setWindowTitle: jest.fn(),
      basename: (p: string) => p.split('/').pop(),
    }

    store.commit('setUsername', 'tester')
    store.commit('clearConnection')
    store.commit('newConnection', null)
    store.commit('connecting', false)

    stubConnectionClient()

    // recordUsed hits the app db; the connect action only cares that it
    // resolves to the config the connected UI is keyed on.
    // Registered under the literal slashed name, the way DataManager does it.
    store.registerModule('data/usedconnections', {
      namespaced: true,
      state: { items: [] },
      actions: { recordUsed: async (_c: any, config: any) => config },
    } as any, { preserveState: false })
  })

  afterEach(() => {
    store.unregisterModule('data/usedconnections')
    store.commit('clearConnection')
    store.commit('connecting', false)
  })

  it('commits connected and usedConfig on success', async () => {
    const result = await store.dispatch('connect', { config: CONFIG })

    expect(result).toBe(true)
    expect(store.state.connected).toBe(true)
    expect(store.state.usedConfig).toBeTruthy()
    expect(store.state.connecting).toBe(false)
  })

  it('commits usedConfig before connected so the core interface never renders without one', async () => {
    // Watchers keyed on usedConfig (initial query tab, pins) rely on this
    // ordering, and the connection button renders `v-if="config"`.
    const order: string[] = []
    const unsubscribe = store.subscribe((mutation) => {
      if (mutation.type === 'newConnection' || mutation.type === 'connected') {
        order.push(mutation.type)
      }
    })

    await store.dispatch('connect', { config: CONFIG })
    unsubscribe()

    expect(order).toEqual(['newConnection', 'connected'])
  })

  it('stays disconnected and tears down the backend when bootstrap fails', async () => {
    stubConnectionClient({
      listTables: async () => { throw new Error('permission denied for schema public') }
    })

    await expect(store.dispatch('connect', { config: CONFIG }))
      .rejects.toThrow('permission denied for schema public')

    expect(store.state.connected).toBe(false)
    expect(store.state.usedConfig).toBeNull()
    // the connection conn/create opened must not be left dangling
    expect(sent).toContain('conn/disconnect')
    expect(sent).toContain('conn/clearConnection')
    expect(store.state.connecting).toBe(false)
  })

  it('propagates a failure from conn/create without committing anything', async () => {
    sendImpl = async (channel) => {
      if (channel === 'conn/create') throw new Error('Database file not found: /tmp/x.db')
      return undefined
    }

    await expect(store.dispatch('connect', { config: CONFIG }))
      .rejects.toThrow('Database file not found')

    expect(store.state.connected).toBe(false)
    expect(store.state.usedConfig).toBeNull()
    expect(store.state.connecting).toBe(false)
  })

  it('rejects a second connect while one is still in flight', async () => {
    let releaseCreate: () => void
    const createStarted = new Promise<void>((resolveStarted) => {
      sendImpl = async (channel) => {
        if (channel === 'conn/create') {
          resolveStarted()
          await new Promise<void>((r) => { releaseCreate = r })
        }
        return undefined
      }
    })

    const first = store.dispatch('connect', { config: CONFIG })
    await createStarted

    // A sidebar double-click or quick-search pick lands here mid-flight. Both
    // attempts share one utility-process connection slot, so the second must be
    // refused rather than race the first.
    await expect(store.dispatch('connect', { config: CONFIG }))
      .rejects.toThrow('already in progress')

    releaseCreate()
    await expect(first).resolves.toBe(true)
    expect(store.state.connected).toBe(true)
  })

  it('keeps a working connection when post-connect housekeeping fails', async () => {
    sendImpl = async (channel) => {
      if (channel === 'appdb/tabhistory/clearDeletedTabs') throw new Error('tab history unavailable')
      return undefined
    }

    await expect(store.dispatch('connect', { config: CONFIG })).resolves.toBe(true)
    expect(store.state.connected).toBe(true)
  })
})
